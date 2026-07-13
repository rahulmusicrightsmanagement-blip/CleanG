#!/usr/bin/env bash
# Load a CleanG dump into a NEW (empty) database, then verify the row counts.
#
# Usage:  ./scripts/db_restore.sh <dump-file> '<new-database-url>'
#   e.g.  ./scripts/db_restore.sh ../backups/cleang_20260713_115815.dump \
#             'postgresql://user:pass@new-host:5432/cleang'
#
# Safe by design: refuses to touch a database that already has CleanG tables, so
# a mistyped URL can't overwrite a live database. Drop/recreate the target first
# if you really mean to replace it.
set -euo pipefail

DUMP="${1:?usage: db_restore.sh <dump-file> <new-database-url>}"
NEW_URL="${2:?usage: db_restore.sh <dump-file> <new-database-url>}"
PG_IMAGE="${PG_IMAGE:-postgres:18}"

[[ -f "$DUMP" ]] || { echo "no such dump: $DUMP" >&2; exit 1; }
DUMP_DIR="$(cd "$(dirname "$DUMP")" && pwd)"
DUMP_FILE="$(basename "$DUMP")"
URL="${NEW_URL/postgres:\/\//postgresql://}"

run() { docker run --rm --network host -v "$DUMP_DIR:/bk" "$PG_IMAGE" "$@"; }

echo "-> target: $(sed -E 's#(://[^:]+:)[^@]+@#\1***@#' <<<"$URL")"
run psql "$URL" -tAc "select 'reachable'" >/dev/null || {
  echo "cannot reach the new database — check the URL/firewall" >&2; exit 2; }

EXISTING=$(run psql "$URL" -tAc \
  "select count(*) from information_schema.tables
    where table_schema='public' and table_name in ('users','master_data','uploaded_files')")
if [[ "$EXISTING" -gt 0 ]]; then
  echo "REFUSING: target already has CleanG tables ($EXISTING found)." >&2
  echo "Restore only into an empty database." >&2
  exit 3
fi

echo "-> restoring $DUMP_FILE"
run pg_restore --no-owner --no-privileges --exit-on-error -d "$URL" "/bk/$DUMP_FILE"

echo "-> row counts in the new database:"
run psql "$URL" -tAc "
select 'users', count(*) from users
union all select 'branches', count(*) from branches
union all select 'uploaded_files', count(*) from uploaded_files
union all select 'master_data', count(*) from master_data
union all select 'master_columns', count(*) from master_columns
union all select 'audit_events', count(*) from audit_events
union all select 'activity_log', count(*) from activity_log;" | sed 's/|/ = /' | sed 's/^/     /'

echo
echo "-> now point the app at it:"
echo "   1. backend/.env      DATABASE_URL=<new url>   (local)"
echo "   2. Coolify env vars  DATABASE_URL=<new url>   (prod) + redeploy"
echo "   3. docker compose exec backend python -m app.dbcheck   -> expect exit 0"
