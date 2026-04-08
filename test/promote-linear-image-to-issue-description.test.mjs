import test from "node:test";
import assert from "node:assert/strict";

import { promoteImageToIssueDescription } from "../skills/linear-cli-issues/scripts/promote_linear_image_to_issue_description.mjs";

test("promoteImageToIssueDescription merges uploaded image markdown into existing description", async () => {
  let capturedUpdate = null;

  const result = await promoteImageToIssueDescription(
    {
      issueId: "CNS-123",
      filepath: "/tmp/example.png",
      workspace: "cns-labs",
      altText: "Example image",
      position: "append",
      dryRun: true,
    },
    {
      uploadFile: async () => ({
        assetUrl: "https://public.linear.app/org/example.png",
      }),
      readIssue: () => ({
        description: "## Existing\n\nBody",
      }),
      updateIssue: (payload) => {
        capturedUpdate = payload;
      },
    },
  );

  assert.equal(capturedUpdate, null);
  assert.equal(result.updated, false);
  assert.equal(
    result.mergedDescription,
    "## Existing\n\nBody\n\n![Example image](https://public.linear.app/org/example.png)",
  );
});

test("promoteImageToIssueDescription writes update when not dry-run", async () => {
  let capturedUpdate = null;

  const result = await promoteImageToIssueDescription(
    {
      issueId: "CNS-124",
      filepath: "/tmp/example.png",
      workspace: "cns-labs",
      position: "prepend",
      dryRun: false,
    },
    {
      uploadFile: async () => ({
        assetUrl: "https://public.linear.app/org/example.png",
      }),
      readIssue: () => ({
        description: "Existing body",
      }),
      updateIssue: (payload) => {
        capturedUpdate = payload;
      },
    },
  );

  assert.equal(result.updated, true);
  assert.ok(result.descriptionFile);
  assert.deepEqual(capturedUpdate, {
    issueId: "CNS-124",
    workspace: "cns-labs",
    descriptionFile: result.descriptionFile,
  });
  assert.equal(
    result.mergedDescription,
    "![example.png](https://public.linear.app/org/example.png)\n\nExisting body",
  );
});
