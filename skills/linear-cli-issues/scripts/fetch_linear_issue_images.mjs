#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
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

  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  for (const match of markdown.matchAll(imagePattern)) {
    const label = match[1] || null;
    const url = stripWrapping(match[2]);
    const key = `image:${url}`;
    if (!seen.has(key)) {
      seen.add(key);
      assets.push({ kind: "image", url, label });
    }
  }

  const linkPattern = /\[([^\]]*)\]\(([^)\s]+)\)/g;
  for (const match of markdown.matchAll(linkPattern)) {
    if (match.index > 0 && markdown[match.index - 1] === "!") continue;
    const label = match[1] || null;
    const url = stripWrapping(match[2]);
    if (!getLinearUploadHost(url)) continue;
    const key = `link:${url}`;
    if (!seen.has(key)) {
      seen.add(key);
      assets.push({ kind: "link", url, label });
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
    const filename = `${sanitizeLabel(asset.label)}${extension}`;
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

function readIssueData(issueId, workspace) {
  const args = ["issue", "view", issueId, "--json", "--no-download"];
  if (workspace) {
    args.push("-w", workspace);
  }
  const output = execFileSync("linear", args, { encoding: "utf8" });
  return JSON.parse(output);
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
    await mkdtemp(join(tmpdir(), "linear-cli-issue-images-"));
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
