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
   - known issue id -> `linear issue view`
   - branch-linked issue -> `linear issue id` then `linear issue view`
   - named project -> `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --project <project> --limit <n>`
   - named cycle -> `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --cycle <cycle> --limit <n>`
   - named milestone -> `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --project <project> --milestone <milestone> --limit <n>`
   - named state -> `linear issue list --sort priority --all-assignees --team <teamKey> -s <state> --limit <n>`
   - no team context -> `linear team list`
   - one team -> auto-select it
   - multiple teams with no disambiguation -> ask for the team
3. Prefer deterministic, non-interactive writes when the request is specific.
4. For long markdown descriptions, use `--description-file <path>` instead of long inline quoting.
5. After writes, verify with `linear issue view <issueId>` or a targeted follow-up read.

## Quality Standard

Bring strong Linear issue hygiene to every action:

- titles should describe the user-visible or operational outcome
- descriptions should capture problem, scope, constraints, and success shape
- use labels, assignee, state, project, milestone, cycle, and priority when they materially improve execution
- split vague omnibus tickets into smaller issues when appropriate
- if the request is pure notes or context, prefer a document over a new issue
- if the request is actionable tracked work, create the issue instead of burying it in a document
- if the request is pure inspection, grouping, or reporting, do not create a new artifact

## Quick Reference

- Quick issue capture: create the smallest useful issue that preserves the work, then refine later if needed.
- Issue read path: default to `linear issue view <issueId>`; use `linear issue describe` only when the Linear trailer matters, and `linear issue url` only when the user explicitly wants the link.
- Quick issue comment: post directly when it is a factual operational note; draft first when it contains decisions, commitments, or stakeholder-facing status.
- Broad issue discovery: `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --limit <n>`.
- Destructive cleanup: confirm before `linear issue delete`, `linear issue comment delete`, or `linear issue relation delete`.

## Capture vs Communication

- Capture freely when the user needs something written down quickly.
- Draft first when the content is stakeholder-facing, commitment-bearing, or a polished rewrite.
- Destructive actions like `linear issue delete` or deleting comments or relations require confirmation.

## Recipes

- If the user wants to capture a rough idea quickly, use `linear issue create --title <title> --description <description>` or `linear issue create --title <title> --description-file <path>`, then verify with `linear issue view <issueId>`.
- If the user asks what issue to work on and no issue is identified, check `linear team list` first, then use `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --limit <n>`.
- If the user wants a quick operational comment, use `linear issue comment add <issueId> --body <text>` or `linear issue comment add <issueId> --body-file <path>`, then verify with `linear issue comment list <issueId>`.
- If the user needs dependency context, use `linear issue relation list <issueId>` before changing relations, and use `linear issue relation add` or `linear issue relation delete` only after the intent is clear.
- If the user asks to delete or clean up issue-side objects, require confirmation first and then verify the result with `linear issue view <issueId>`, `linear issue comment list <issueId>`, or `linear issue relation list <issueId>`.

## Output

Report what was inspected or changed, the issue identifiers involved, and any hygiene improvements or follow-up structure that would make the work more actionable.
