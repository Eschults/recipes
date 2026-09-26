# shellcheck shell=bash
# Shared by bin/harness-install and bin/harness-upgrade. Meant to be sourced,
# not run directly: it expects the caller to have set $src and cd'd to the
# repo root already.
HARNESS_FILES=(
  ".github/workflows/claude.yml"
  ".claude/prompts/issue-to-pr.md"
  ".claude/prompts/next-to-build.md"
  ".claude/harness-rules.md"
  ".claude/HARNESS_VERSION"
)

fetch_harness_files() {
  for f in "${HARNESS_FILES[@]}"; do
    # shellcheck disable=SC2154 # src is set by the caller before sourcing this file
    curl -fsSL "$src/$f" -o "$f"
  done
}
