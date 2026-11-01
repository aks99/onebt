#!/usr/bin/env bash
# Runs every Promptfoo suite. Requires ANTHROPIC_API_KEY. Exits non-zero if any suite fails.
set -uo pipefail
cd "$(dirname "$0")/.."
: "${ANTHROPIC_API_KEY:?set ANTHROPIC_API_KEY}"
fail=0
for c in promptfoo.*.yaml; do
  echo "== $c"
  npx --yes promptfoo@0.117.0 eval -c "$c" --no-cache -o "results/$(basename "$c" .yaml).json" || fail=1
done
exit $fail
