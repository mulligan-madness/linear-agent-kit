#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  downloadAsset,
  extractMarkdownAssets,
} from "../../linear-agent-kit-issues/scripts/fetch_linear_issue_images.mjs";

export function collectDocumentAssets(document) {
  const documentId = document.id || document.slugId || "unknown-document";
  return extractMarkdownAssets(document.content).map((asset) => ({
    ...asset,
    sourceType: "document",
    sourceId: documentId,
  }));
}

export function readDocumentData(documentId, workspace) {
  const args = ["document", "view", documentId, "--json"];
  if (workspace) {
    args.push("-w", workspace);
  }
  const output = execFileSync("linear", args, { encoding: "utf8" });
  return JSON.parse(output);
}

export function resolveApiKey(workspace) {
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

export async function fetchDocumentImages(options, deps = {}) {
  const {
    documentId,
    workspace = null,
    download = true,
    downloadDir = null,
  } = options;

  const {
    readDocument = readDocumentData,
    downloadOne = downloadAsset,
    resolveApiKey: getApiKey = resolveApiKey,
  } = deps;

  const document = readDocument(documentId, workspace);
  const targetDir = downloadDir ||
    await mkdtemp(join(tmpdir(), "linear-agent-kit-document-images-"));
  const apiKey = download ? getApiKey(workspace) : null;
  const assets = collectDocumentAssets(document);
  const results = [];

  for (const asset of assets) {
    if (!download) {
      results.push({
        ...asset,
        hostType: "unknown",
        status: "skipped",
        path: null,
        error: null,
      });
      continue;
    }

    results.push(
      await downloadOne({
        asset,
        downloadDir: targetDir,
        apiKey,
      }),
    );
  }

  return {
    documentId: document.id || documentId,
    workspace,
    title: document.title,
    url: document.url,
    downloadAttempted: download,
    downloadDir: targetDir,
    assets: results,
  };
}

function parseArgs(argv) {
  const options = {
    documentId: null,
    workspace: null,
    download: true,
    downloadDir: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--document":
      case "-d":
        options.documentId = argv[++index] ?? null;
        break;
      case "--workspace":
      case "-w":
        options.workspace = argv[++index] ?? null;
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
      "Usage: fetch_linear_document_images.mjs --document <documentId> [options]",
      "",
      "Options:",
      "  -d, --document <documentId>  Linear document ID or slug-like identifier",
      "  -w, --workspace <slug>       Linear workspace slug",
      "      --extract-only           Do not attempt downloads; return refs only",
      "      --download-dir <path>    Directory for downloaded assets",
      "  -h, --help                   Show this help",
    ].join("\n"),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.documentId) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const result = await fetchDocumentImages(options);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
