import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildAuthHeaders,
  collectIssueAssets,
  downloadAsset,
  extractMarkdownAssets,
  mergeDescriptionWithBlock,
  renderImageMarkdown,
  requestLinearUpload,
} from "../skills/linear-agent-kit-issues/scripts/fetch_linear_issue_images.mjs";

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

test("extractMarkdownAssets handles angle-bracket URLs and nested parentheses", () => {
  const markdown = [
    "![diagram](<https://example.com/assets/(diagram).png>)",
    "",
    "[upload](https://uploads.linear.app/org/path/(spec).pdf)",
  ].join("\n");

  const assets = extractMarkdownAssets(markdown);

  assert.deepEqual(
    assets.map(({ kind, url, label }) => ({ kind, url, label })),
    [
      {
        kind: "image",
        url: "https://example.com/assets/(diagram).png",
        label: "diagram",
      },
      {
        kind: "link",
        url: "https://uploads.linear.app/org/path/(spec).pdf",
        label: "upload",
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

test("collectIssueAssets includes CLI-shaped issue attachments when requested", () => {
  const issueData = {
    identifier: "CNS-999",
    description: "No inline assets",
    attachments: [
      {
        id: "attachment-1",
        title: "Planning contract",
        url: "https://uploads.linear.app/org/contract.md",
      },
      {
        id: "attachment-2",
        subtitle: "Fallback label",
        url: "https://uploads.linear.app/org/fallback.txt",
      },
    ],
  };

  assert.deepEqual(collectIssueAssets(issueData), []);

  const assets = collectIssueAssets(issueData, { includeAttachments: true });

  assert.deepEqual(
    assets.map(({ sourceType, sourceId, kind, label, url }) => ({
      sourceType,
      sourceId,
      kind,
      label,
      url,
    })),
    [
      {
        sourceType: "attachment",
        sourceId: "attachment-1",
        kind: "attachment",
        label: "Planning contract",
        url: "https://uploads.linear.app/org/contract.md",
      },
      {
        sourceType: "attachment",
        sourceId: "attachment-2",
        kind: "attachment",
        label: "Fallback label",
        url: "https://uploads.linear.app/org/fallback.txt",
      },
    ],
  );
});

test("collectIssueAssets includes GraphQL-shaped issue attachments when requested", () => {
  const issueData = {
    identifier: "CNS-999",
    description: "No inline assets",
    attachments: {
      nodes: [
        {
          id: "attachment-1",
          title: null,
          subtitle: null,
          url: "https://uploads.linear.app/org/file.json",
        },
      ],
    },
  };

  const assets = collectIssueAssets(issueData, { includeAttachments: true });

  assert.deepEqual(
    assets.map(({ sourceType, sourceId, kind, label, url }) => ({
      sourceType,
      sourceId,
      kind,
      label,
      url,
    })),
    [
      {
        sourceType: "attachment",
        sourceId: "attachment-1",
        kind: "attachment",
        label: "attachment",
        url: "https://uploads.linear.app/org/file.json",
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
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-helper-test-"));

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

test("downloadAsset saves Markdown content with md extension inferred from response type", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/markdown" });
    response.end("# Planning contract\n");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-helper-test-"));

  try {
    const result = await downloadAsset({
      asset: {
        kind: "attachment",
        url: `http://127.0.0.1:${port}/fixture`,
        label: "planning contract",
        sourceType: "attachment",
        sourceId: "attachment-1",
      },
      downloadDir,
      fetchImpl: fetch,
      apiKey: null,
    });

    assert.equal(result.status, "downloaded");
    assert.match(result.path ?? "", /planning-contract\.md$/);
    assert.equal(await readFile(result.path, "utf8"), "# Planning contract\n");
  } finally {
    server.close();
    await rm(downloadDir, { recursive: true, force: true });
  }
});

test("downloadAsset does not duplicate file extensions already present in label", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-helper-test-"));

  try {
    const result = await downloadAsset({
      asset: {
        kind: "image",
        url: `http://127.0.0.1:${port}/fixture`,
        label: "fixture.png",
        sourceType: "description",
        sourceId: "CNS-999",
      },
      downloadDir,
      fetchImpl: fetch,
      apiKey: null,
    });

    assert.equal(result.status, "downloaded");
    assert.match(result.path ?? "", /fixture\.png$/);
    assert.doesNotMatch(result.path ?? "", /\.png\.png$/);
  } finally {
    server.close();
    await rm(downloadDir, { recursive: true, force: true });
  }
});

test("downloadAsset reports fetch errors without throwing", async () => {
  const downloadDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-helper-test-"));

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

test("renderImageMarkdown and mergeDescriptionWithBlock build deterministic description content", () => {
  const markdown = renderImageMarkdown({
    altText: "fixture",
    assetUrl: "https://public.linear.app/org/file.png",
  });

  assert.equal(markdown, "![fixture](https://public.linear.app/org/file.png)");
  assert.equal(
    mergeDescriptionWithBlock({
      currentDescription: "## Existing\n\nBody",
      block: markdown,
      position: "append",
    }),
    "## Existing\n\nBody\n\n![fixture](https://public.linear.app/org/file.png)",
  );
  assert.equal(
    mergeDescriptionWithBlock({
      currentDescription: "## Existing\n\nBody",
      block: markdown,
      position: "prepend",
    }),
    "![fixture](https://public.linear.app/org/file.png)\n\n## Existing\n\nBody",
  );
});

test("requestLinearUpload returns parsed upload metadata from linear api", async () => {
  const fixtureDir = await mkdtemp(join(tmpdir(), "linear-agent-kit-helper-test-"));
  const fixturePath = join(fixtureDir, "fixture.png");
  await writeFile(fixturePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  try {
    const upload = await requestLinearUpload({
      filepath: fixturePath,
      workspace: "cns-labs",
      apiCaller: (args) => {
        assert.equal(args[0], "api");
        assert.match(args[1], /mutation FileUpload/);
        return {
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                assetUrl: "https://public.linear.app/org/file.png",
                uploadUrl: "https://upload.example.test",
                headers: [{ key: "x-test", value: "1" }],
              },
            },
          },
        };
      },
    });

    assert.equal(upload.assetUrl, "https://public.linear.app/org/file.png");
    assert.equal(upload.uploadUrl, "https://upload.example.test");
    assert.deepEqual(upload.headers, [{ key: "x-test", value: "1" }]);
    assert.equal(upload.contentType, "image/png");
    assert.equal(upload.filename, "fixture.png");
    assert.equal(upload.size, 4);
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});
