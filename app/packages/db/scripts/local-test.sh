#!/usr/bin/env bash
# Applies all migrations to a fresh database and runs the RLS and gate tests. Exits non-zero on any failure.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-obt_test}"
scripts/local-apply.sh "$DB" >/dev/null
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f tests/rls_and_gates.sql
