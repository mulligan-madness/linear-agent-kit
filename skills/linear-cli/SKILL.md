---
name: linear-cli
description: Use when a task should be handled through the local linear CLI and the right Linear workflow has not yet been classified
---

# Linear CLI

## Overview

Use this skill as the umbrella entrypoint for general Linear CLI work. Resolve workspace context, classify intent, and route quickly to the specialist skill that owns the command family.

## Direct Scope

This skill may directly handle only small orientation tasks:

- is `linear` installed
- which workspaces are configured
- which workspace is currently active
- which specialist skill should handle the request
- which artifact type best fits the request

Once the request is clearly scoped to a domain, route immediately and do not keep broad triage in scope. This skill must not perform substantive issue, planning, or workspace mutations itself.

## Workflow

1. Resolve local CLI state first when relevant:
   - `linear --version`
   - `linear auth list`
   - `linear auth whoami`
2. Resolve workspace policy:
   - if the user names a workspace, use `-w <slug>`
   - otherwise use the configured default workspace
   - if the default workspace would be risky or ambiguous, ask
3. Choose the artifact when the request is about new work:
   - issue = actionable tracked work
   - document = notes, context, spec, or reference that is not yet execution work
   - project = one coordinated execution stream with a coherent outcome
   - initiative = clearly cross-project or strategic coordination
   - no new artifact = pure inspection, grouping, or reporting
4. Use the fallback order when the artifact is ambiguous:
   - prefer document only for pure notes or context
   - between document and issue, otherwise prefer issue
   - between issue and project, prefer issue unless the request clearly coordinates multiple issues toward one coherent outcome
   - between project and initiative, prefer project unless the request is clearly cross-project or strategic
   - ask only when the risk of choosing the wrong artifact is high
5. Classify the request:
   - auth or workspace selection -> `linear-cli-auth`
   - issues, comments, attachments, dependencies, branch-linked lookup -> `linear-cli-issues`
   - PR publishing tied to Linear issues, stacked-base recommendation, issue-to-commit PR drafting, and post-PR issue updates -> `linear-cli-pr-publish`
   - projects, milestones, cycles, initiatives, status updates -> `linear-cli-planning`
   - teams, labels, documents, config, schema, autolinks -> `linear-cli-workspace`
   - raw GraphQL fallback -> `linear-cli-api`
6. Summarize the chosen route in one line and switch to the specialist skill.

## Guardrails

- Prefer first-class CLI subcommands over `linear api`.
- Never print tokens or call `linear auth token` unless the user explicitly asks for that exposure.
- Reads and drafting can be autonomous. Destructive changes require confirmation.
- If the request is just to capture something quickly, optimize for a minimally useful Linear artifact rather than perfection.
- Do not invent new work structure when the request is only inspection, grouping, or reporting.

## Allowed Commands

- `linear --version`
- `linear auth list`
- `linear auth whoami`
- `linear -w <slug> auth whoami`

## Output

End with a short routing statement that says what was checked, which workspace will be used, and which specialist skill owns the task.
