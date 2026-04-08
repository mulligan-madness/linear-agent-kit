# Linear CLI Skills for Codex

This repo ships a bundle of Codex skills for using the local [`linear`](https://github.com/schpet/linear-cli) CLI.

Included skills:

1. `linear-cli`
2. `linear-cli-auth`
3. `linear-cli-issues`
4. `linear-cli-pr-publish`
5. `linear-cli-planning`
6. `linear-cli-workspace`
7. `linear-cli-api`

Bundled helper scripts:

1. `skills/linear-cli-issues/scripts/fetch_linear_issue_images.mjs`
2. `skills/linear-cli-issues/scripts/promote_linear_image_to_issue_description.mjs`
3. `skills/linear-cli-workspace/scripts/fetch_linear_document_images.mjs`

## Quick install

Clone the repo, then run:

```bash
./install.sh
```

By default this installs the skills into `${CODEX_HOME:-$HOME/.codex}/skills`.

After installing, restart Codex so a new session picks up the new skills.

## What this bundle does

These skills teach Codex how to:

1. route general Linear requests to the right workflow
2. manage Linear auth and workspace selection safely
3. create, inspect, and update issues with good hygiene
4. handle planning objects and status updates with evidence-first workflows
5. use documents, labels, teams, and other workspace features without guessing
6. fall back to raw `linear api` only when first-class CLI commands are insufficient

The bundled helper script supports image-aware issue workflows by:

1. extracting inline image references from issue descriptions and optional comments
2. downloading retrievable assets to local temp paths using the same auth rule as the upstream CLI for `uploads.linear.app`
3. returning machine-readable JSON so agents can hand successful local files to native image-viewing tools

The bundled promotion helper supports local-image-to-description workflows by:

1. uploading a local image file to Linear cloud storage
2. generating the corresponding markdown image reference
3. merging that reference into the target issue description non-destructively

The bundled document-image helper supports document workflows by:

1. extracting inline image and Linear-upload links from document markdown
2. downloading retrievable assets to local temp paths
3. returning machine-readable JSON so agents can hand successful local files to native image-viewing tools

## Local install target

The installer copies each skill directory into:

```bash
${CODEX_HOME:-$HOME/.codex}/skills/
```

Installed directories:

1. `linear-cli`
2. `linear-cli-auth`
3. `linear-cli-issues`
4. `linear-cli-pr-publish`
5. `linear-cli-planning`
6. `linear-cli-workspace`
7. `linear-cli-api`
