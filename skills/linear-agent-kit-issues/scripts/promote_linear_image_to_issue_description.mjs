#!/usr/bin/env node

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import {
  mergeDescriptionWithBlock,
  readIssueData,
  renderImageMarkdown,
  updateIssueDescription,
  uploadFileToLinear,
} from "./fetch_linear_issue_images.mjs";

function parseArgs(argv) {
  const options = {
    issueId: null,
    filepath: null,
    workspace: null,
    altText: null,
    position: "append",
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--issue":
      case "-i":
        options.issueId = argv[++index] ?? null;
        break;
      case "--file":
      case "-f":
        options.filepath = argv[++index] ?? null;
        break;
      case "--workspace":
      case "-w":
        options.workspace = argv[++index] ?? null;
        break;
      case "--alt":
        options.altText = argv[++index] ?? null;
        break;
      case "--position":
        options.position = argv[++index] ?? "append";
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.position !== "append" && options.position !== "prepend") {
    throw new Error(`Unsupported position: ${options.position}`);
  }

  return options;
}

function printHelp() {
  console.log(
    [
      "Usage: promote_linear_image_to_issue_description.mjs --issue <issueId> --file <path> [options]",
      "",
      "Options:",
      "  -i, --issue <issueId>        Linear issue identifier, e.g. CNS-61",
      "  -f, --file <path>            Local file to upload and reference",
      "  -w, --workspace <slug>       Linear workspace slug",
      "      --alt <text>            Alt text for the inserted markdown image",
      "      --position <mode>       prepend or append (default: append)",
      "      --dry-run               Upload and merge, but do not update the issue",
      "  -h, --help                  Show this help",
    ].join("\n"),
  );
}

function resolveAltText(filepath, altText) {
  return altText || basename(filepath);
}

export async function promoteImageToIssueDescription({
  issueId,
  filepath,
  workspace,
  altText,
  position = "append",
  dryRun = false,
}, deps = {}) {
  const {
    uploadFile = uploadFileToLinear,
    readIssue = readIssueData,
    updateIssue = updateIssueDescription,
  } = deps;

  const uploaded = await uploadFile({
    filepath,
    workspace,
  });
  const imageMarkdown = renderImageMarkdown({
    altText: resolveAltText(filepath, altText),
    assetUrl: uploaded.assetUrl,
  });
  const issueData = readIssue(issueId, workspace);
  const mergedDescription = mergeDescriptionWithBlock({
    currentDescription: issueData.description || "",
    block: imageMarkdown,
    position,
  });

  let descriptionFile = null;
  if (!dryRun) {
    const tempDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-promote-image-"));
    descriptionFile = join(tempDir, `${issueId}-description.md`);
    await writeFile(descriptionFile, mergedDescription);
    updateIssue({
      issueId,
      workspace,
      descriptionFile,
    });
  }

  return {
    issueId,
    workspace,
    assetUrl: uploaded.assetUrl,
    imageMarkdown,
    mergedDescription,
    descriptionFile,
    updated: !dryRun,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.issueId || !options.filepath) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const result = await promoteImageToIssueDescription({
    issueId: options.issueId,
    filepath: options.filepath,
    workspace: options.workspace,
    altText: options.altText,
    position: options.position,
    dryRun: options.dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
