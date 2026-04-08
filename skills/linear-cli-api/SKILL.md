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
- the task needs narrow structured markdown fields that are awkward to retrieve from the first-class output

## Workflow

1. Check whether a first-class command already covers the task.
2. State explicitly why `linear api` is necessary.
3. Inspect schema when needed before writing a raw query or mutation.
4. Keep the query or mutation as narrow as possible.
5. For issue and comment reads, prefer querying only the fields you need, such as `description`, comment `body`, or attachment metadata.
6. Treat `linear api` as a structured-read escape hatch, not as a reason to skip first-class `linear issue update` or comment commands when those writes already exist.
7. Verify any mutating API call with a fresh read through either `linear api` or a first-class subcommand.

## Guardrails

- Do not use this skill just because it feels more flexible.
- Keep secrets out of output.
- Treat destructive mutations as confirmation-required.
- Prefer first-class reads and writes when the CLI already supports them.
- Do not assume `linear api` can fetch image bytes for inline issue images; it can retrieve markdown and URLs, but actual image-content retrieval may still require a separate fetch path.

## Recipes

### Fallback-only workflow
- Trigger: the requested action cannot be expressed cleanly with first-class CLI subcommands
- Commands: `linear schema`, then `linear api <query>`
- Verify: confirm the API call returned the expected data or mutation result, then re-read with the narrowest possible follow-up command

### Structured markdown read
- Trigger: the issue or comment contains inline images or long markdown, and first-class rendered output is noisy or lossy
- Commands: `linear api <query>` for only the needed issue or comment fields
- Verify: compare the returned markdown or URLs against a first-class `--json --no-download` read when available

## Output

State why fallback was required, what query or mutation was run, and how the result was verified.
