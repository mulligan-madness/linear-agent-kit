---
name: linear-cli-issues
description: Use when working on Linear issues, comments, attachments, dependencies, branch-linked issue lookup, or PR helper flows through the local linear CLI
---

# Linear CLI Issues

## Overview

Use this skill for issue work through the local CLI: reading issues, creating or updating issues, managing comments, adding attachments, inspecting or editing dependencies, and using branch or PR helpers.

## Allowed Commands

- `linear issue id`
- `linear issue list`
- `linear issue title`
- `linear issue view`
- `linear issue url`
- `linear issue describe`
- `linear issue start`
- `linear issue create`
- `linear issue update`
- `linear issue delete`
- `linear issue pull-request`
- `linear issue attach`
- `linear issue comment add`
- `linear issue comment list`
- `linear issue comment update`
- `linear issue comment delete`
- `linear issue relation add`
- `linear issue relation list`
- `linear issue relation delete`
- `linear team list`

## Workflow

1. Resolve workspace first:
   - if the user names a workspace, keep `-w <slug>` authoritative
   - otherwise use the configured default workspace
2. Use the issue discovery order:
   - known issue id -> `linear issue view <issueId> --json --no-download`
   - branch-linked issue -> `linear issue id` then `linear issue view <issueId> --json --no-download`
   - named project -> `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --project <project> --limit <n>`
   - named cycle -> `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --cycle <cycle> --limit <n>`
   - named milestone -> `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --project <project> --milestone <milestone> --limit <n>`
   - named state -> `linear issue list --sort priority --all-assignees --team <teamKey> -s <state> --limit <n>`
   - no team context -> `linear team list`
   - one team -> auto-select it
   - multiple teams with no disambiguation -> ask for the team
3. Prefer deterministic, non-interactive writes when the request is specific.
4. Prefer structured reads:
   - use `linear issue view <issueId> --json --no-download` when you need to inspect or preserve markdown exactly
   - use `linear issue view <issueId> --no-download` for human-readable terminal output without attachment download noise
   - use `linear issue comment list <issueId> --json` when comment parsing or image preservation matters
   - use `linear issue describe <issueId>` only for the Linear trailer
5. For long markdown descriptions or comment bodies, use `--description-file <path>` or `--body-file <path>` instead of long inline quoting.
6. Treat description updates as full replacements:
   - when the user wants to append, tighten, or partially revise the issue body, first read the existing description with `--json --no-download`
   - merge the requested change into the existing markdown intentionally
   - preserve unrelated sections and existing inline image markdown unless the user explicitly asks to remove or replace them
   - if the request is only a status note or small addendum, prefer a comment instead of rewriting the description
7. Treat inline images as a two-step workflow:
   - first detect image markdown or remote URLs with `--json --no-download`
   - if the task only needs preservation, keep the markdown unchanged
   - if the task needs actual image-content inspection, run `scripts/fetch_linear_issue_images.mjs --issue <issueId> [--workspace <slug>] [--comments]`
   - when the helper returns local file paths, inspect those files with the environment's native image tool instead of shell-level binary inspection
   - if the helper reports failed downloads, treat that as a blocker on image understanding and report it directly
   - do not fall back to ad hoc `curl`, hex dumps, or other shell-level binary inspection after the helper has already failed
   - do not rely on `linear issue view` auto-download behavior for verification
8. After writes, verify with `linear issue view <issueId> --json --no-download` or another targeted structured read.

## Quality Standard

Bring strong Linear issue hygiene to every action:

- titles should describe the user-visible or operational outcome
- descriptions should capture problem, scope, constraints, and success shape
- use labels, assignee, state, project, milestone, cycle, and priority when they materially improve execution
- split vague omnibus tickets into smaller issues when appropriate
- if the request is pure notes or context, prefer a document over a new issue
- if the request is actionable tracked work, create the issue instead of burying it in a document
- if the request is pure inspection, grouping, or reporting, do not create a new artifact
- when updating descriptions, preserve existing markdown that the user did not ask to remove
- when descriptions or comments include inline images, preserve the image markdown by default and explicitly call out any image-fetch limitation

## Quick Reference

- Quick issue capture: create the smallest useful issue that preserves the work, then refine later if needed.
- Issue read path: default to `linear issue view <issueId> --json --no-download`; use plain `--no-download` when a human-readable view is enough, use `linear issue describe` only when the Linear trailer matters, and use `linear issue url` only when the user explicitly wants the link.
- Comment read path: default to `linear issue comment list <issueId> --json` when you need structured comment bodies or image-aware handling.
- Description rewrite path: default to read-merge-write, not blind replacement, unless the user explicitly wants a full rewrite.
- Image inspection path: use `scripts/fetch_linear_issue_images.mjs`, then open successful local paths with the environment's image tool.
- If the helper cannot retrieve bytes, stop and report the blocker instead of inventing a second shell download path.
- Quick issue comment: post directly when it is a factual operational note; draft first when it contains decisions, commitments, or stakeholder-facing status.
- Broad issue discovery: `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --limit <n>`.
- Destructive cleanup: confirm before `linear issue delete`, `linear issue comment delete`, or `linear issue relation delete`.

## Capture vs Communication

- Capture freely when the user needs something written down quickly.
- Draft first when the content is stakeholder-facing, commitment-bearing, or a polished rewrite.
- If the request is additive and the issue already contains useful structure or inline images, preserve that structure and merge the change into the existing body.
- Destructive actions like `linear issue delete` or deleting comments or relations require confirmation.

## Recipes

- If the user wants to capture a rough idea quickly, use `linear issue create --title <title> --description <description>` or `linear issue create --title <title> --description-file <path>`, then verify with `linear issue view <issueId> --json --no-download`.
- If the user asks what issue to work on and no issue is identified, check `linear team list` first, then use `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --limit <n>`.
- If the user wants a quick operational comment, use `linear issue comment add <issueId> --body <text>` or `linear issue comment add <issueId> --body-file <path>`, then verify with `linear issue comment list <issueId> --json`.
- If the user wants a partial description change, read the current body with `linear issue view <issueId> --json --no-download`, preserve existing sections and image markdown, write the merged result to a temp file, then update with `linear issue update <issueId> --description-file <path>` and verify with another structured read.
- If the user needs dependency context, use `linear issue relation list <issueId>` before changing relations, and use `linear issue relation add` or `linear issue relation delete` only after the intent is clear.
- If the user asks to inspect issue images, run `scripts/fetch_linear_issue_images.mjs --issue <issueId> [--workspace <slug>] [--comments]`, then open any returned local file paths with the environment's image tool. If the helper reports download failures, state that the image reference exists but the asset could not be retrieved, and stop instead of attempting ad hoc shell downloads.
- If the user asks to delete or clean up issue-side objects, require confirmation first and then verify the result with `linear issue view <issueId> --json --no-download`, `linear issue comment list <issueId> --json`, or `linear issue relation list <issueId>`.

## Output

Report what was inspected or changed, the issue identifiers involved, and any hygiene improvements or follow-up structure that would make the work more actionable.
