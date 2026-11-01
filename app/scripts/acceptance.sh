#!/usr/bin/env bash
# Phase 1 acceptance, the automated part (blueprint 14.1, screen inventory Section 11, runbook step 11).
# Runs every guard and test suite the repo carries and prints one line per check. Exits non-zero if any fails.
# Database checks need a local Postgres (packages/db/scripts/local-test.sh); set SKIP_DB=1 to leave them out.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
step() { local name="$1"; shift; if "$@" >/tmp/acceptance-step.log 2>&1; then echo "PASS  $name"; else echo "FAIL  $name"; tail -20 /tmp/acceptance-step.log; fail=1; fi; }

step "copy lint (no em dashes, exclamation marks or banned phrases in app copy)" node tools/copy-lint/check.mjs
step "design tokens build" node packages/ui/scripts/build-tokens.mjs
step "contrast: every token pair 4.5:1 text and 3:1 UI, light and dark" node packages/ui/scripts/check-contrast.mjs
step "no capture: no camera, microphone, recording or media upload anywhere" node packages/ui/scripts/check-no-capture.mjs
step "prompt library: every action has a prompt, a schema, the preamble and a registry row" node packages/prompts/scripts/check-prompts.mjs
step "eval suite structure (Promptfoo, 13.15)" node packages/evals/scripts/check-suite.mjs
step "ui package typecheck" pnpm --filter @onebigtalk/ui typecheck
step "web typecheck" pnpm --filter @onebigtalk/web typecheck
step "web unit tests (Vitest)" pnpm --filter @onebigtalk/web test
if [ "${SKIP_DB:-0}" != "1" ]; then
  step "database: migrations apply from empty and the RLS and gate checks pass (two members, a curator, an admin, anon)" bash packages/db/scripts/local-test.sh "${OBT_TEST_DB:-obt_test}"
else
  echo "SKIP  database checks (SKIP_DB=1)"
fi
if [ "$fail" = "0" ]; then echo "acceptance: all automated checks pass"; else echo "acceptance: failures above"; exit 1; fi
