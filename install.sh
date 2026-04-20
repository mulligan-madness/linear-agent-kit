#!/bin/zsh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
CODEX_DEST_ROOT="${CODEX_HOME_DIR}/skills"
CURSOR_PLUGIN_ROOT="${CURSOR_PLUGIN_HOME:-$HOME/.cursor/plugins/local}"
CURSOR_DEST_ROOT="${CURSOR_PLUGIN_ROOT}/linear-agent-kit"

print_usage() {
  cat <<'EOF'
Usage:
  ./install.sh codex
  ./install.sh cursor
  ./install.sh both

This helper installs the Linear Agent Kit adapters after the upstream
Linear CLI (`linear`) is already installed and authenticated.
EOF
}

print_linear_install_help() {
  cat <<'EOF'
The upstream Linear CLI executable (`linear`) is not installed.

Install it first with one of:

  brew install schpet/tap/linear

or

  deno install -A --reload -f -g -n linear jsr:@schpet/linear-cli

Then verify with:

  linear --version
EOF
}

print_linear_auth_help() {
  cat <<'EOF'
The upstream Linear CLI is installed, but it is not authenticated.

Run:

  linear auth login

Then verify with:

  linear auth list
  linear auth whoami
EOF
}

require_linear() {
  if ! command -v linear >/dev/null 2>&1; then
    print_linear_install_help
    exit 1
  fi

  linear --version >/dev/null
}

require_linear_auth() {
  if ! linear auth list >/dev/null 2>&1; then
    print_linear_auth_help
    exit 1
  fi

  if ! linear auth whoami >/dev/null 2>&1; then
    print_linear_auth_help
    exit 1
  fi
}

install_codex() {
  mkdir -p "$CODEX_DEST_ROOT"

  for skill_dir in "$REPO_ROOT"/skills/*; do
    skill_name="$(basename "$skill_dir")"
    dest_dir="$CODEX_DEST_ROOT/$skill_name"
    rm -rf "$dest_dir"
    cp -R "$skill_dir" "$dest_dir"
    echo "Installed Codex skill $skill_name -> $dest_dir"
  done
}

install_cursor() {
  mkdir -p "$CURSOR_PLUGIN_ROOT"
  rm -rf "$CURSOR_DEST_ROOT"
  mkdir -p "$CURSOR_DEST_ROOT"

  cp -R "$REPO_ROOT/.cursor-plugin" "$CURSOR_DEST_ROOT/.cursor-plugin"
  cp -R "$REPO_ROOT/skills" "$CURSOR_DEST_ROOT/skills"

  echo "Installed Cursor plugin -> $CURSOR_DEST_ROOT"
}

main() {
  local target="${1:-}"

  case "$target" in
    codex|cursor|both) ;;
    *)
      print_usage
      exit 1
      ;;
  esac

  require_linear
  require_linear_auth

  case "$target" in
    codex)
      install_codex
      ;;
    cursor)
      install_cursor
      ;;
    both)
      install_codex
      install_cursor
      ;;
  esac

  echo
  echo "Linear Agent Kit install complete."
  echo "Codex restart: start a new session."
  echo "Cursor restart: restart Cursor."
}

main "$@"
