# Linear Agent Kit

`linear-agent-kit` is a reusable Codex and Cursor package for working with the upstream Linear CLI executable, `linear`.

This repo is not the upstream CLI itself.

- Upstream dependency: [`schpet/linear-cli`](https://github.com/schpet/linear-cli)
- Executable installed on the machine: `linear`
- This repo: agent skills, helper scripts, install docs, and adapter packaging

## What You Need First

Install the upstream Linear CLI if it is not already present.

Recommended install paths from the upstream project:

```bash
brew install schpet/tap/linear
```

or

```bash
deno install -A --reload -f -g -n linear jsr:@schpet/linear-cli
```

Verify:

```bash
linear --version
```

Then authenticate:

```bash
linear auth login
```

Verify auth:

```bash
linear auth list
linear auth whoami
```

## For Agents

Copy and paste this into Codex, Cursor, or another coding agent:

```text
Set up the Linear Agent Kit from https://github.com/mulligan-madness/linear-agent-kit on this machine.

Important distinction:
- The upstream dependency is the Linear CLI executable, `linear`.
- This repository is the Linear Agent Kit.

Your job:
1. Read these docs before doing anything else:
   - https://raw.githubusercontent.com/mulligan-madness/linear-agent-kit/main/README.md
   - https://raw.githubusercontent.com/mulligan-madness/linear-agent-kit/main/INSTALL.md
2. Check whether the upstream Linear CLI is installed by running `linear --version`.
3. If `linear` is missing:
   - first try `brew install schpet/tap/linear`
   - if Homebrew is unavailable, use `deno install -A --reload -f -g -n linear jsr:@schpet/linear-cli`
   - then verify with `linear --version`
4. Check whether `linear` is authenticated by running `linear auth list` and `linear auth whoami`.
5. If authentication is missing, run `linear auth login`, complete the auth flow, and verify again.
6. Ask the user which adapter(s) to install: `codex`, `cursor`, or `both`.
7. After the user answers:
   - clone `https://github.com/mulligan-madness/linear-agent-kit.git` if the repo is not already present locally
   - run `./install.sh codex`, `./install.sh cursor`, or `./install.sh both` from the repo root
8. Verify the installed files exist in the expected location.
9. Report:
   - whether `linear` is installed
   - whether `linear` is authenticated
   - which adapter(s) were installed
   - the exact install location(s)
   - any restart step required

Do not guess paths. Read the repository files first and use the installation steps they define.
```

## Manual Install

Detailed install steps live in [INSTALL.md](INSTALL.md).

If you already have `linear` installed and authenticated, you can use the helper script:

```bash
./install.sh codex
./install.sh cursor
./install.sh both
```

## What Gets Installed

Codex:

- skill directories copied into `${CODEX_HOME:-$HOME/.codex}/skills`

Cursor:

- a local plugin copied into `${CURSOR_PLUGIN_HOME:-$HOME/.cursor/plugins/local}/linear-agent-kit`
- the plugin exposes the same shared `skills/` tree to Cursor

## Verify Adapter Install

Codex:

- start a new session
- confirm the skill names are available under the `linear-agent-kit*` family

Cursor:

- restart Cursor after installation
- start a new Agent session and confirm the plugin is loaded

## Included Skills

1. `linear-agent-kit`
2. `linear-agent-kit-auth`
3. `linear-agent-kit-issues`
4. `linear-agent-kit-pr-publish`
5. `linear-agent-kit-planning`
6. `linear-agent-kit-workspace`
7. `linear-agent-kit-api`

## Helper Scripts

1. `skills/linear-agent-kit-issues/scripts/fetch_linear_issue_images.mjs`
2. `skills/linear-agent-kit-issues/scripts/promote_linear_image_to_issue_description.mjs`
3. `skills/linear-agent-kit-workspace/scripts/fetch_linear_document_images.mjs`
