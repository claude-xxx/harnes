#!/usr/bin/env bash
# Aggregate static-check loop for the whole dashboard-app.
# Runs:
#   1. backend `npm run check`  (lint + typecheck + format:check)
#   2. frontend `npm run check` (lint + typecheck + format:check)
#   3. AGENTS.md line-count guard (FL-004): hard fail if AGENTS.md exceeds
#      AGENTS_MD_MAX_LINES (default 120 = 100-line target + 20-line margin)
#
# Usage: bash scripts/check.sh   (invoke from anywhere; the script resolves
# its own location)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> backend: npm run check"
( cd "$ROOT/backend" && npm run check )

echo "==> frontend: npm run check"
( cd "$ROOT/frontend" && npm run check )

echo "==> AGENTS.md line-count guard (FL-004)"
AGENTS_MD="$ROOT/AGENTS.md"
AGENTS_MD_MAX_LINES="${AGENTS_MD_MAX_LINES:-120}"
AGENTS_MD_LINES=$(wc -l < "$AGENTS_MD")
if [ "$AGENTS_MD_LINES" -gt "$AGENTS_MD_MAX_LINES" ]; then
  echo "FAIL: AGENTS.md is $AGENTS_MD_LINES lines, exceeding the hard cap of $AGENTS_MD_MAX_LINES." >&2
  echo "" >&2
  echo "AGENTS.md must remain a ~100-line index. The cap above is the hard limit (target 100, margin 20)." >&2
  echo "Reason: AGENTS.md is autoloaded by Claude Code at session start. Bloat raises cost, latency, and noise on every session." >&2
  echo "How to fix: move detailed content (recipes, command tables, subagent how-to, context-loading rules) into docs/<topic>.md and leave only a one-line pointer in AGENTS.md." >&2
  echo "Reference: docs/failure-log.jsonl FL-004 and docs/core-beliefs/index.md (process section)." >&2
  exit 1
fi
echo "OK: AGENTS.md is $AGENTS_MD_LINES lines (cap $AGENTS_MD_MAX_LINES)."

echo
echo "OK: all static checks passed."
