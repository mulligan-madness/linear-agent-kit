# Linear CLI Skills for Codex

This repo ships a bundle of Codex skills for using the local [`linear`](https://github.com/schpet/linear-cli) CLI.

Included skills:

1. `linear-cli`
2. `linear-cli-auth`
3. `linear-cli-issues`
4. `linear-cli-planning`
5. `linear-cli-workspace`
6. `linear-cli-api`

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

## Local install target

The installer copies each skill directory into:

```bash
${CODEX_HOME:-$HOME/.codex}/skills/
```

Installed directories:

1. `linear-cli`
2. `linear-cli-auth`
3. `linear-cli-issues`
4. `linear-cli-planning`
5. `linear-cli-workspace`
6. `linear-cli-api`
