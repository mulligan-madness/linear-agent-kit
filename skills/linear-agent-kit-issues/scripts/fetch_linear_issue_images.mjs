#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

const LINEAR_PRIVATE_UPLOAD_HOST = "uploads.linear.app";
const LINEAR_PUBLIC_UPLOAD_HOST = "public.linear.app";
const LINEAR_UPLOAD_HOSTS = new Set([
  LINEAR_PRIVATE_UPLOAD_HOST,
  LINEAR_PUBLIC_UPLOAD_HOST,
]);

const CONTENT_TYPE_EXTENSIONS = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
  ["application/pdf", ".pdf"],
]);

const MIME_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".bmp", "image/bmp"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
]);

export function getLinearUploadHost(url) {
  try {
    const { hostname } = new URL(url);
    return LINEAR_UPLOAD_HOSTS.has(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export function buildAuthHeaders(url, apiKey) {
  return getLinearUploadHost(url) === LINEAR_PRIVATE_UPLOAD_HOST && apiKey
    ? { Authorization: apiKey }
    : {};
}

export function extractMarkdownAssets(markdown) {
  if (!markdown) return [];

  const assets = [];
  const seen = new Set();

  for (const token of parseMarkdownInlineAssets(markdown)) {
    if (token.kind === "link" && !getLinearUploadHost(token.url)) {
      continue;
    }
    const key = `${token.kind}:${token.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      assets.push({
        kind: token.kind,
        url: token.url,
        label: token.label,
      });
    }
  }

  return assets;
}

export function collectIssueAssets(issueData, options = {}) {
  const { includeComments = false } = options;
  const issueId = issueData.identifier || issueData.id || "unknown-issue";
  const assets = extractMarkdownAssets(issueData.description).map((asset) => ({
    ...asset,
    sourceType: "description",
    sourceId: issueId,
  }));

  if (!includeComments || !Array.isArray(issueData.comments)) {
    return assets;
  }

  for (const comment of issueData.comments) {
    const commentId = comment.id || "unknown-comment";
    for (const asset of extractMarkdownAssets(comment.body)) {
      assets.push({
        ...asset,
        sourceType: "comment",
        sourceId: commentId,
      });
    }
  }

  return assets;
}

function stripWrapping(value) {
  if (value.startsWith("<") && value.endsWith(">")) {
    return value.slice(1, -1);
  }
  return value;
}

function parseMarkdownInlineAssets(markdown) {
  const tokens = [];

  for (let index = 0; index < markdown.length; index += 1) {
    const isImage = markdown[index] === "!" && markdown[index + 1] === "[";
    const isLink = markdown[index] === "[";
    if (!isImage && !isLink) continue;

    const labelStart = isImage ? index + 2 : index + 1;
    const labelEnd = findClosingBracket(markdown, labelStart - 1);
    if (labelEnd === -1) continue;

    let cursor = labelEnd + 1;
    while (markdown[cursor] === " " || markdown[cursor] === "\t") {
      cursor += 1;
    }
    if (markdown[cursor] !== "(") {
      index = labelEnd;
      continue;
    }

    const destination = parseLinkDestination(markdown, cursor);
    if (!destination) {
      index = cursor;
      continue;
    }

    tokens.push({
      kind: isImage ? "image" : "link",
      label: markdown.slice(labelStart, labelEnd) || null,
      url: stripWrapping(destination.value),
    });
    index = destination.end;
  }

  return tokens;
}

function findClosingBracket(markdown, openIndex) {
  let escaped = false;
  for (let index = openIndex + 1; index < markdown.length; index += 1) {
    const char = markdown[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "]") {
      return index;
    }
  }
  return -1;
}

function parseLinkDestination(markdown, openParenIndex) {
  let index = openParenIndex + 1;
  while (markdown[index] === " " || markdown[index] === "\t" || markdown[index] === "\n") {
    index += 1;
  }

  if (markdown[index] === "<") {
    const close = markdown.indexOf(">", index + 1);
    if (close === -1) return null;
    const closeParen = markdown.indexOf(")", close + 1);
    if (closeParen === -1) return null;
    return {
      value: markdown.slice(index, close + 1),
      end: closeParen,
    };
  }

  let escaped = false;
  let depth = 0;
  const start = index;

  for (; index < markdown.length; index += 1) {
    const char = markdown[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      if (depth === 0) {
        return {
          value: markdown.slice(start, index).trim(),
          end: index,
        };
      }
      depth -= 1;
    }
  }

  return null;
}

function inferExtension(url, contentType) {
  const normalizedType = contentType?.split(";")[0]?.trim().toLowerCase() || "";
  if (CONTENT_TYPE_EXTENSIONS.has(normalizedType)) {
    return CONTENT_TYPE_EXTENSIONS.get(normalizedType);
  }

  try {
    const parsed = new URL(url);
    const extension = extname(parsed.pathname);
    if (extension) return extension;
    const name = basename(parsed.pathname);
    if (name.includes(".")) return extname(name);
  } catch {
    return "";
  }

  return "";
}

function sanitizeLabel(label) {
  const base = (label || "asset")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || "asset";
}

function chooseFilename(label, extension) {
  const base = sanitizeLabel(label);
  if (!extension) return base;
  return base.toLowerCase().endsWith(extension.toLowerCase())
    ? base
    : `${base}${extension}`;
}

function getUrlHash(url) {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export async function downloadAsset({
  asset,
  downloadDir,
  fetchImpl = fetch,
  apiKey = null,
}) {
  try {
    const hash = getUrlHash(asset.url);
    const assetDir = join(downloadDir, hash);
    await mkdir(assetDir, { recursive: true });

    const headers = buildAuthHeaders(asset.url, apiKey);
    const response = await fetchImpl(asset.url, { headers, redirect: "follow" });

    if (!response.ok) {
      return {
        ...asset,
        hostType: describeHost(asset.url),
        status: "failed",
        error: `${response.status} ${response.statusText}`.trim(),
        path: null,
      };
    }

    const contentType = response.headers.get("content-type");
    const extension = inferExtension(asset.url, contentType);
    const filename = chooseFilename(asset.label, extension);
    const filepath = join(assetDir, filename);

    if (existsSync(filepath)) {
      return {
        ...asset,
        hostType: describeHost(asset.url),
        status: "cached",
        contentType,
        path: filepath,
        error: null,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(filepath, buffer);

    return {
      ...asset,
      hostType: describeHost(asset.url),
      status: "downloaded",
      contentType,
      path: filepath,
      error: null,
    };
  } catch (error) {
    return {
      ...asset,
      hostType: describeHost(asset.url),
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      path: null,
    };
  }
}

function getMimeType(filepath) {
  const extension = extname(filepath).toLowerCase();
  return MIME_TYPES.get(extension) || "application/octet-stream";
}

export function renderImageMarkdown({ altText, assetUrl }) {
  return `![${altText || "image"}](${assetUrl})`;
}

export function mergeDescriptionWithBlock({
  currentDescription,
  block,
  position = "append",
}) {
  const trimmedCurrent = currentDescription?.trim() || "";
  const trimmedBlock = block.trim();
  if (!trimmedCurrent) return trimmedBlock;
  if (position === "prepend") {
    return `${trimmedBlock}\n\n${trimmedCurrent}`;
  }
  return `${trimmedCurrent}\n\n${trimmedBlock}`;
}

function describeHost(url) {
  const host = getLinearUploadHost(url);
  if (host === LINEAR_PRIVATE_UPLOAD_HOST) return "linear-private";
  if (host === LINEAR_PUBLIC_UPLOAD_HOST) return "linear-public";
  return "external";
}

function resolveApiKey(workspace) {
  try {
    const args = ["auth", "token"];
    if (workspace) {
      args.push("-w", workspace);
    }
    return execFileSync("linear", args, { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

export function readIssueData(issueId, workspace) {
  const args = ["issue", "view", issueId, "--json", "--no-download"];
  if (workspace) {
    args.push("-w", workspace);
  }
  const output = execFileSync("linear", args, { encoding: "utf8" });
  return JSON.parse(output);
}

function runLinearJsonCommand(args) {
  const output = execFileSync("linear", args, { encoding: "utf8" });
  return JSON.parse(output);
}

export function requestLinearUpload({
  filepath,
  workspace,
  apiCaller = runLinearJsonCommand,
}) {
  const mutation = `
    mutation FileUpload($contentType: String!, $filename: String!, $size: Int!, $makePublic: Boolean) {
      fileUpload(contentType: $contentType, filename: $filename, size: $size, makePublic: $makePublic) {
        success
        uploadFile {
          assetUrl
          uploadUrl
          headers {
            key
            value
          }
        }
      }
    }
  `;

  const filename = basename(filepath);
  const contentType = getMimeType(filepath);
  const makePublic = contentType.startsWith("image/") && contentType !== "image/svg+xml";

  return stat(filepath).then((fileInfo) => {
    const size = fileInfo.size;
    const args = ["api", mutation, "--variables-json", JSON.stringify({
      contentType,
      filename,
      size,
      makePublic,
    })];
    if (workspace) {
      args.push("-w", workspace);
    }

    const data = apiCaller(args);
    const upload = data?.data?.fileUpload?.uploadFile;
    if (!data?.data?.fileUpload?.success || !upload) {
      throw new Error("Failed to request Linear upload URL");
    }

    return {
      filename,
      contentType,
      size,
      assetUrl: upload.assetUrl,
      uploadUrl: upload.uploadUrl,
      headers: upload.headers ?? [],
    };
  });
}

export async function uploadFileToLinear({
  filepath,
  workspace,
  fetchImpl = fetch,
  apiCaller = runLinearJsonCommand,
}) {
  const upload = await requestLinearUpload({ filepath, workspace, apiCaller });
  const fileBytes = await readFile(filepath);
  const headers = {
    "content-type": upload.contentType,
  };
  for (const header of upload.headers) {
    headers[header.key] = header.value;
  }

  const response = await fetchImpl(upload.uploadUrl, {
    method: "PUT",
    headers,
    body: fileBytes,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return upload;
}

export function updateIssueDescription({
  issueId,
  workspace,
  descriptionFile,
}) {
  const args = ["issue", "update", issueId, "--description-file", descriptionFile];
  if (workspace) {
    args.push("-w", workspace);
  }
  execFileSync("linear", args, { encoding: "utf8", stdio: "pipe" });
}

function parseArgs(argv) {
  const options = {
    issueId: null,
    workspace: null,
    includeComments: false,
    download: true,
    downloadDir: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--issue":
      case "-i":
        options.issueId = argv[++index] ?? null;
        break;
      case "--workspace":
      case "-w":
        options.workspace = argv[++index] ?? null;
        break;
      case "--comments":
        options.includeComments = true;
        break;
      case "--extract-only":
        options.download = false;
        break;
      case "--download-dir":
        options.downloadDir = argv[++index] ?? null;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(
    [
      "Usage: fetch_linear_issue_images.mjs --issue <issueId> [options]",
      "",
      "Options:",
      "  -i, --issue <issueId>        Linear issue identifier, e.g. CNS-61",
      "  -w, --workspace <slug>       Linear workspace slug",
      "      --comments               Include issue comments in extraction",
      "      --extract-only           Do not attempt downloads; return refs only",
      "      --download-dir <path>    Directory for downloaded assets",
      "  -h, --help                   Show this help",
    ].join("\n"),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.issueId) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const issueData = readIssueData(options.issueId, options.workspace);
  const downloadDir = options.downloadDir ||
    await mkdtemp(join(tmpdir(), "linear-agent-kit-issue-images-"));
  const apiKey = options.download ? resolveApiKey(options.workspace) : null;
  const assets = collectIssueAssets(issueData, {
    includeComments: options.includeComments,
  });

  const results = [];
  for (const asset of assets) {
    if (!options.download) {
      results.push({
        ...asset,
        hostType: describeHost(asset.url),
        status: "skipped",
        path: null,
        error: null,
      });
      continue;
    }

    results.push(
      await downloadAsset({
        asset,
        downloadDir,
        apiKey,
      }),
    );
  }

  const payload = {
    issueId: issueData.identifier || options.issueId,
    workspace: options.workspace,
    includeComments: options.includeComments,
    downloadAttempted: options.download,
    downloadDir,
    assets: results,
  };

  console.log(JSON.stringify(payload, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
