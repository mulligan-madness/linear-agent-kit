import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildAuthHeaders,
  collectIssueAssets,
  downloadAsset,
  extractMarkdownAssets,
} from "../skills/linear-cli-issues/scripts/fetch_linear_issue_images.mjs";

test("extractMarkdownAssets finds markdown images and Linear upload links", () => {
  const markdown = [
    "![hero](https://example.com/hero.png)",
    "",
    "[spec pdf](https://uploads.linear.app/org/spec.pdf)",
    "",
    "[external](https://example.com/doc.pdf)",
  ].join("\n");

  const assets = extractMarkdownAssets(markdown);

  assert.deepEqual(
    assets.map(({ kind, url, label }) => ({ kind, url, label })),
    [
      {
        kind: "image",
        url: "https://example.com/hero.png",
        label: "hero",
      },
      {
        kind: "link",
        url: "https://uploads.linear.app/org/spec.pdf",
        label: "spec pdf",
      },
    ],
  );
});

test("collectIssueAssets includes description and comments when requested", () => {
  const issueData = {
    identifier: "CNS-999",
    description: "![fixture](https://example.com/a.png)",
    comments: [
      {
        id: "comment-1",
        body: "[upload](https://uploads.linear.app/org/file.png)",
      },
      {
        id: "comment-2",
        body: "No assets here",
      },
    ],
  };

  const assets = collectIssueAssets(issueData, { includeComments: true });

  assert.deepEqual(
    assets.map(({ sourceType, sourceId, kind, url }) => ({
      sourceType,
      sourceId,
      kind,
      url,
    })),
    [
      {
        sourceType: "description",
        sourceId: "CNS-999",
        kind: "image",
        url: "https://example.com/a.png",
      },
      {
        sourceType: "comment",
        sourceId: "comment-1",
        kind: "link",
        url: "https://uploads.linear.app/org/file.png",
      },
    ],
  );
});

test("buildAuthHeaders only adds auth for private Linear uploads", () => {
  assert.deepEqual(buildAuthHeaders("https://example.com/test.png", "secret"), {});
  assert.deepEqual(
    buildAuthHeaders("https://uploads.linear.app/org/test.png", "secret"),
    { Authorization: "secret" },
  );
  assert.deepEqual(buildAuthHeaders("https://uploads.linear.app/org/test.png", ""), {});
});

test("downloadAsset saves content with extension inferred from response type", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-cli-helper-test-"));

  try {
    const result = await downloadAsset({
      asset: {
        kind: "image",
        url: `http://127.0.0.1:${port}/fixture`,
        label: "fixture image",
        sourceType: "description",
        sourceId: "CNS-999",
      },
      downloadDir,
      fetchImpl: fetch,
      apiKey: null,
    });

    assert.equal(result.status, "downloaded");
    assert.match(result.path ?? "", /\.png$/);
    const data = await readFile(result.path);
    assert.deepEqual([...data], [0x89, 0x50, 0x4e, 0x47]);
  } finally {
    server.close();
    await rm(downloadDir, { recursive: true, force: true });
  }
});

test("downloadAsset reports fetch errors without throwing", async () => {
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-cli-helper-test-"));

  try {
    const result = await downloadAsset({
      asset: {
        kind: "image",
        url: "https://example.invalid/not-reachable.png",
        label: "broken image",
        sourceType: "description",
        sourceId: "CNS-999",
      },
      downloadDir,
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
      apiKey: null,
    });

    assert.equal(result.status, "failed");
    assert.equal(result.path, null);
    assert.match(result.error ?? "", /fetch failed/);
  } finally {
    await rm(downloadDir, { recursive: true, force: true });
  }
});
