#!/bin/zsh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
DEST_ROOT="${CODEX_HOME_DIR}/skills"

mkdir -p "$DEST_ROOT"

for skill_dir in "$REPO_ROOT"/skills/*; do
  skill_name="$(basename "$skill_dir")"
  dest_dir="$DEST_ROOT/$skill_name"
  rm -rf "$dest_dir"
  cp -R "$skill_dir" "$dest_dir"
  echo "Installed $skill_name -> $dest_dir"
done

echo
echo "Installed Linear CLI skills into $DEST_ROOT"
echo "Restart Codex to pick up new skills."
