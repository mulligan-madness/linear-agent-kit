---
name: linear-cli-workspace
description: Use when working on Linear teams, labels, documents, workspace configuration, schema inspection, or repository autolinks through the local linear CLI
---

# Linear CLI Workspace

## Overview

Use this skill for workspace-scoped administration and supporting structures: teams, labels, documents, `linear config`, `linear schema`, and team autolinks.

## Allowed Commands

- `linear team ...`
- `linear label ...`
- `linear document ...`
- `linear config`
- `linear schema`

## Workflow

1. Discover current state before writes:
   - `linear team list`
   - `linear team members`
   - `linear label list`
   - `linear document list`
   - `linear document view <id>`
2. Use explicit `-w <slug>` when the workspace is named.
3. For documents, prefer file-backed content when the markdown is substantial:
   - `linear document create --content-file <path>`
   - `linear document update --content-file <path>`
4. Verify changes with a follow-up `list` or `view`.

## Quality Standard

- documents should hold notes, context, or rough thinking that can be refined later
- issues should hold tracked execution work, not loose notes
- labels should clarify triage and reporting rather than duplicate state
- team and autolink changes should improve workflow consistency, not surprise the workspace
- config and schema inspection should be used to inform safe CLI behavior, not as casual noise

## Safety Rules

- Quick capture into a document can be autonomous.
- Quick operational notes can post directly.
- Stakeholder-facing communication drafts first.
- If it is unclear whether the content is quick ops or stakeholder-facing, draft first.
- Changes that affect shared workspace structure, such as team deletion or label deletion, require confirmation.
- Avoid casual workspace-wide churn. Favor surgical changes backed by inspection.

## Recipes

### Document vs issue choice
- Trigger: `i need to write this down before i lose it`
- Commands: if it is notes or context, use `linear document create -t <title> -c <content>`; if it is tracked execution work, route to `linear-cli-issues`
- Verify: the chosen artifact matches the user intent, and no execution ticket is created for pure notes

### Document capture
- Trigger: `turn this rough idea into something I can refine later`
- Commands: `linear document create -t <title> -c <content>` or `linear document create -t <title> --content-file <path>`
- Verify: the document contains enough structure that someone else can pick it up later

### Label and team inspection
- Trigger: `show me the workspace structure`
- Commands: `linear label list`, `linear team list`, `linear team members`
- Verify: summarize what exists without mutating anything

### Structural cleanup confirmation
- Trigger: `clean up old labels` or `remove a team`
- Commands: confirm first, then run the specific delete command
- Verify: no structural delete happens until the user explicitly confirms

## Output

Report the workspace structures inspected or changed and call out any naming, triage, or documentation improvements that would make the workspace easier to operate.
