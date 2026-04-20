# Install Linear Agent Kit

Use this file when setting up the kit for a human teammate or when asking another agent to do it.

## 1. Install The Upstream Linear CLI

Install the upstream dependency first. This repo does not replace it.

```bash
brew install schpet/tap/linear
```

Fallback:

```bash
deno install -A --reload -f -g -n linear jsr:@schpet/linear-cli
```

Verify:

```bash
linear --version
```

## 2. Authenticate The Linear CLI

```bash
linear auth login
```

Verify:

```bash
linear auth list
linear auth whoami
```

## 3. Install The Adapter

Use the helper:

```bash
./install.sh codex
./install.sh cursor
./install.sh both
```

The helper will stop if `linear` is missing or unauthenticated.

Install targets:

- Codex: `${CODEX_HOME:-$HOME/.codex}/skills`
- Cursor: `${CURSOR_PLUGIN_HOME:-$HOME/.cursor/plugins/local}/linear-agent-kit`

## 4. Restart The Agent

- Codex: start a new session
- Cursor: restart Cursor

## For Agents

```text
Set up this repository's Linear Agent Kit on this machine.

Important distinction:
- The upstream dependency is the Linear CLI executable, `linear`.
- This repository is the Linear Agent Kit.

Required process:
1. Read `README.md` and `INSTALL.md`.
2. Run `linear --version`.
3. If `linear` is missing, install it using the documented commands in this repository and verify again.
4. Run `linear auth list` and `linear auth whoami`.
5. If auth is missing, run `linear auth login` and verify again.
6. Ask the user which adapter(s) to install: `codex`, `cursor`, or `both`.
7. Run the documented install flow for the selected adapter(s).
8. Verify the installed files exist in the documented target location(s).
9. Report the exact result and any restart step required.
```
