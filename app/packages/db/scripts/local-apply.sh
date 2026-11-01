#!/usr/bin/env bash
# Applies the local auth shim and every migration to a fresh database on the local Postgres.
# Usage: PGHOST=/tmp PGPORT=5499 PGUSER=postgres scripts/local-apply.sh [dbname]
# On Supabase the shim is NOT applied; only supabase/migrations/*.sql are.
set -euo pipefail
DB="${1:-obt_test}"
cd "$(dirname "$0")/.."
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists ${DB};" -c "create database ${DB};"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f local/0000_local_auth_shim.sql
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"
done
echo "applied $(ls supabase/migrations/*.sql | wc -l) migrations to ${DB}"
