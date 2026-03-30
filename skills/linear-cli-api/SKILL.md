---
name: linear-cli-api
description: Use when the requested Linear workflow cannot be expressed cleanly with first-class linear CLI subcommands and raw GraphQL access is necessary
---

# Linear CLI API

## Overview

Use this skill only as the raw GraphQL escape hatch. The default path is always first-class `linear` subcommands.

## Allowed Commands

- `linear api <query>`
- `linear schema`

## When to Use

Use this skill only when:

- the CLI subcommands do not cover the workflow
- the request genuinely needs GraphQL-only fields or mutations
- you can explain why the first-class CLI surface is insufficient

## Workflow

1. Check whether a first-class command already covers the task.
2. State explicitly why `linear api` is necessary.
3. Inspect schema when needed before writing a raw query or mutation.
4. Keep the query or mutation as narrow as possible.
5. Verify any mutating API call with a fresh read through either `linear api` or a first-class subcommand.

## Guardrails

- Do not use this skill just because it feels more flexible.
- Keep secrets out of output.
- Treat destructive mutations as confirmation-required.
- Prefer first-class reads and writes when the CLI already supports them.

## Recipes

### Fallback-only workflow
- Trigger: the requested action cannot be expressed cleanly with first-class CLI subcommands
- Commands: `linear schema`, then `linear api <query>`
- Verify: confirm the API call returned the expected data or mutation result, then re-read with the narrowest possible follow-up command

## Output

State why fallback was required, what query or mutation was run, and how the result was verified.
