---
name: linear-agent-kit-planning
description: Use when managing Linear projects, milestones, cycles, initiatives, or status updates through the upstream `linear` CLI
---

# Linear Agent Kit Planning

## Overview

Use this skill for planning structures and execution tracking: projects, milestones, cycles, initiatives, project status updates, and initiative timeline updates.

## Allowed Commands

- `linear project ...`
- `linear milestone ...`
- `linear cycle ...`
- `linear initiative ...`
- `linear project-update ...`
- `linear initiative-update ...`

## Workflow

1. Discover the current planning state first:
   - `linear project list --json` when you need structured inspection across projects
   - `linear project view <projectId>`
   - `linear milestone list`
   - `linear cycle list`
   - `linear initiative list --json`
   - `linear initiative view <initiativeId> --json`
   - `linear project-update list <projectId> --json`
   - `linear initiative-update list <initiativeId> --json`
2. Use explicit workspace targeting when the user names a workspace.
3. For create or update actions, prefer specific flag-driven commands over interactive prompts when inputs are known.
4. When a planning object does not expose the structured fields you need through first-class CLI output, route to `linear-agent-kit-api` instead of inferring from rendered text.
5. For project and initiative status updates, prefer `--body-file <path>` when the markdown is substantial.
6. After any write, verify with a fresh `view` or `list`.

## Quality Standard

Apply strong planning judgment rather than acting like a thin shell wrapper:

- projects should represent one coherent execution stream
- initiatives should be used only for clearly cross-project or strategic coordination
- milestones should mark real checkpoints
- cycles should be used deliberately, with scope that teams can actually absorb
- status updates should be concise about progress, risk, and next steps
- if the request is only grouping or reporting and existing views or filters are enough, do not create a new planning object
- verify planning reads against structured output when the request depends on exact status-update content or metadata

## Safety Rules

- Factual low-stakes operational updates can post directly.
- Stakeholder-facing updates and polished summaries draft first.
- Creating or updating planning objects can be autonomous when the user intent is clear.
- Broader structural changes, deletion, or archival actions require confirmation.
- When the request is under-specified, investigate first and then propose a cleaner planning shape instead of blindly mirroring weak structure.

## Recipes

### Weekly update drafting
- Trigger: `figure out what project updates I should post this week`
- Commands: `linear project view <projectId>`, `linear project-update list <projectId> --json`, then related `linear issue list --sort priority --all-assignees --all-states --team <teamKey> --project <project>`
- Verify: the draft names progress, blockers or risks, and next steps; if it is stakeholder-facing, show it before posting

### Project vs initiative diagnosis
- Trigger: `find the right project or initiative for this vague piece of work`
- Commands: inspect `linear project list`, `linear initiative list`, and any related issue lists before deciding
- Verify: choose `project` for one coherent execution stream, `initiative` only for clearly cross-project or strategic coordination, and no new object for pure grouping or reporting

### Non-destructive planning inspection
- Trigger: `show me the current planning state`
- Commands: `linear project list --json`, `linear initiative list --json`, `linear cycle list`, `linear milestone list`
- Verify: summarize the current objects and do not create or change anything

### Destructive cleanup
- Trigger: `archive this thing`, `delete this planning object`
- Commands: confirm intent, then use the relevant `delete` or `archive` command for the specific object type
- Verify: the user explicitly confirmed the cleanup before any destructive action

## Output

Summarize the planning objects involved, what changed, and any structural recommendation that would improve execution quality in Linear.
