---
name: linear-agent-kit-auth
description: Use when working on upstream `linear` CLI installation, authentication, configured workspaces, default workspace selection, or workspace-targeting problems
---

# Linear Agent Kit Auth

## Overview

Use this skill for install verification, auth state, configured workspaces, default workspace switching, and workspace-targeting troubleshooting.

## Allowed Commands

- `linear --version`
- `linear auth login`
- `linear auth logout`
- `linear auth list`
- `linear auth default <workspace>`
- `linear auth whoami`
- `linear -w <slug> auth whoami`

## Workflow

1. Inspect current state before changing anything:
   - `linear --version`
   - `linear auth list`
   - `linear auth whoami`
2. If the user named a workspace, verify it explicitly with `linear -w <slug> auth whoami`.
3. For multi-workspace setups:
   - treat `-w <slug>` as the source of truth when the user specified a workspace
   - otherwise rely on the configured default
4. For login flows, prefer stored credentials and native secure storage.
5. After any auth or default change, verify with a fresh `linear auth list` or `linear auth whoami`.

## Guardrails

- Never expose API keys in output.
- Do not use `LINEAR_API_KEY` as the normal path for multi-workspace setups.
- Warn if `LINEAR_API_KEY` may be overriding stored credentials.
- If interactive API-key entry is required, pause only at that point and ask for the minimum needed input.
- Do not log out or remove workspace credentials without confirmation.

## Decision Rules

- Use `linear auth login` when a workspace credential is missing from `linear auth list`; do not re-run it for a workspace that is already configured.
- Use `linear auth default <workspace>` when the user wants to switch the default.
- Use explicit `-w <slug>` verification when auth state seems inconsistent across workspaces.

## Recipes

### Current auth state
- Trigger: `what workspace am i in and what else is configured`
- Commands: `linear auth list`, `linear auth whoami`
- Verify: report the configured workspaces and the active default without exposing any secret

### Workspace verification
- Trigger: `use the wiser-systems workspace for this one`
- Commands: `linear -w wiser-systems auth whoami`
- Verify: the returned workspace and user match the requested workspace

### Default switch verification
- Trigger: `make cns-labs the default`
- Commands: `linear auth default cns-labs`, then `linear auth whoami`
- Verify: the default workspace changes and the follow-up whoami matches it

## Output

Report configured workspace slugs, the default workspace, and the exact verification command outcomes without exposing secrets.
