#!/usr/bin/env bash
# Back up the CleanG database to ../backups/cleang_<timestamp>.dump
#
# The server is PostgreSQL 18, so the dump MUST be taken with an 18 client —
# pg_dump refuses to run against a server newer than itself, and Ubuntu 24.04
# ships client 16. A postgres:18 container supplies the right client, which is
# why this goes through Docker instead of the system pg_dump.
#
# Usage:  ./scripts/db_backup.sh                 # uses DATABASE_URL from backend/.env
#         DATABASE_URL=postgres://... ./scripts/db_backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/../backups}"
PG_IMAGE="${PG_IMAGE:-postgres:18}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  set -a; . "$ROOT/backend/.env"; set +a
fi
# psql/pg_dump don't accept the bare "postgres://" scheme spelling in all paths.
URL="${DATABASE_URL/postgres:\/\//postgresql://}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="cleang_${STAMP}.dump"

echo "-> dumping to $BACKUP_DIR/$OUT"
docker run --rm -v "$BACKUP_DIR:/bk" "$PG_IMAGE" \
  pg_dump "$URL" -Fc --no-owner --no-privileges -f "/bk/$OUT"

# A dump you haven't listed is a dump you haven't checked.
TABLES=$(docker run --rm -v "$BACKUP_DIR:/bk" "$PG_IMAGE" \
  pg_restore -l "/bk/$OUT" | grep -c "TABLE DATA")
echo "-> OK: $(du -h "$BACKUP_DIR/$OUT" | cut -f1), $TABLES tables with data"
echo "$OUT"
