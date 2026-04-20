import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectDocumentAssets,
  fetchDocumentImages,
} from "../skills/linear-agent-kit-workspace/scripts/fetch_linear_document_images.mjs";

test("collectDocumentAssets extracts inline images and linear upload links from document content", () => {
  const document = {
    id: "doc-1",
    title: "Fixture doc",
    content: [
      "# Title",
      "",
      "![diagram](https://uploads.linear.app/org/path/image.png)",
      "",
      "[spec](https://public.linear.app/org/path/spec.pdf)",
    ].join("\n"),
  };

  const assets = collectDocumentAssets(document);

  assert.deepEqual(
    assets.map(({ kind, url, label, sourceType, sourceId }) => ({
      kind,
      url,
      label,
      sourceType,
      sourceId,
    })),
    [
      {
        kind: "image",
        url: "https://uploads.linear.app/org/path/image.png",
        label: "diagram",
        sourceType: "document",
        sourceId: "doc-1",
      },
      {
        kind: "link",
        url: "https://public.linear.app/org/path/spec.pdf",
        label: "spec",
        sourceType: "document",
        sourceId: "doc-1",
      },
    ],
  );
});

test("fetchDocumentImages supports extract-only mode", async () => {
  const result = await fetchDocumentImages(
    {
      documentId: "doc-2",
      workspace: "cns-labs",
      download: false,
      downloadDir: await mkdtemp(join(tmpdir(), "linear-agent-kit-doc-helper-")),
    },
    {
      readDocument: () => ({
        id: "doc-2",
        title: "Fixture doc",
        content: "![fixture](https://example.com/image.png)",
      }),
    },
  );

  assert.equal(result.documentId, "doc-2");
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].status, "skipped");
  await rm(result.downloadDir, { recursive: true, force: true });
});

test("fetchDocumentImages downloads assets via injected downloader", async () => {
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-doc-helper-"));

  try {
    const result = await fetchDocumentImages(
      {
        documentId: "doc-3",
        workspace: "cns-labs",
        download: true,
        downloadDir,
      },
      {
        readDocument: () => ({
          id: "doc-3",
          title: "Fixture doc",
          content: "![fixture](https://example.com/image.png)",
        }),
        downloadOne: async ({ asset }) => ({
          ...asset,
          hostType: "external",
          status: "downloaded",
          path: "/tmp/downloaded-image.png",
          error: null,
        }),
        resolveApiKey: () => "secret",
      },
    );

    assert.equal(result.assets.length, 1);
    assert.equal(result.assets[0].status, "downloaded");
    assert.equal(result.assets[0].path, "/tmp/downloaded-image.png");
  } finally {
    await rm(downloadDir, { recursive: true, force: true });
  }
});
