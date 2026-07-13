"""Layered database diagnostic:  `python -m app.dbcheck`

A database failure can live in one of four layers, and they need completely
different owners to fix:

    1. DNS      the host name doesn't resolve            -> DNS / URL is wrong
    2. TCP      the port doesn't accept a socket         -> DB server is down, or
                                                            moved (infra / hosting)
    3. AUTH     socket opens, login rejected             -> credentials / pg_hba
    4. SCHEMA   logged in, but tables/columns missing    -> incomplete migration
                                                            (this repo's problem)

The app can only tell you "it's broken"; this says *where*, so nobody has to
guess. Exit code is the failing layer number (0 = everything healthy).
"""

import re
import socket
import sys
import time
from urllib.parse import urlsplit

from sqlalchemy import inspect, text

from .config import get_settings
from .database import Base, engine

# Columns added by main._migrate() after the table's original CREATE. These are
# exactly what an interrupted migration would leave behind, so they are what a
# schema check has to look for.
EXPECTED_COLUMNS = {
    "uploaded_files": [
        "corrections", "dropped", "accepted", "constants", "merged_cells",
    ],
    "users": ["must_change_password"],
    "master_columns": ["custom", "attr"],
}


def _redact(url: str) -> str:
    return re.sub(r"(://[^:]+:)[^@]+@", r"\1***@", url)


def main() -> int:
    settings = get_settings()
    url = settings.database_url
    parts = urlsplit(url)
    host, port = parts.hostname, parts.port or 5432

    print(f"database url : {_redact(url)}")
    print(f"host / port  : {host}:{port}\n")

    # --- 1. DNS ---------------------------------------------------------------
    try:
        ip = socket.gethostbyname(host)
        print(f"[1] DNS      OK    {host} -> {ip}")
    except socket.gaierror as exc:
        print(f"[1] DNS      FAIL  {host} does not resolve ({exc})")
        print("\n=> The database host name is wrong or gone. Fix DATABASE_URL.")
        return 1

    # --- 2. TCP ---------------------------------------------------------------
    t = time.time()
    try:
        with socket.create_connection((ip, port), timeout=10):
            print(f"[2] TCP      OK    port {port} accepted in {time.time() - t:.2f}s")
    except (socket.timeout, OSError) as exc:
        kind = "timed out (filtered/firewalled)" if isinstance(
            exc, socket.timeout
        ) else f"refused ({exc.__class__.__name__})"
        print(f"[2] TCP      FAIL  port {port} {kind} after {time.time() - t:.2f}s")
        print(
            "\n=> Nothing is listening on the database port, so NO SQL — and no\n"
            "   migration — has run or could run. This is not a schema problem:\n"
            "   the Postgres server is stopped, or it moved and DATABASE_URL still\n"
            "   points at the old address. Owner: whoever runs the database host."
        )
        return 2

    # --- 3. AUTH --------------------------------------------------------------
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version()")).scalar_one()
        print(f"[3] AUTH     OK    {version.split(',')[0]}")
    except Exception as exc:  # noqa: BLE001 — report, don't crash
        print(f"[3] AUTH     FAIL  {type(exc).__name__}: {str(exc).strip()[:160]}")
        print("\n=> The server answered but rejected the login. Check the "
              "credentials/database name in DATABASE_URL.")
        return 3

    # --- 4. SCHEMA ------------------------------------------------------------
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    missing: list[str] = []

    for table in Base.metadata.tables:
        if table not in existing_tables:
            missing.append(f"table {table}")

    for table, columns in EXPECTED_COLUMNS.items():
        if table not in existing_tables:
            continue
        present = {c["name"] for c in inspector.get_columns(table)}
        missing.extend(f"{table}.{c}" for c in columns if c not in present)

    if missing:
        print(f"[4] SCHEMA   FAIL  {len(missing)} missing object(s):")
        for m in missing:
            print(f"                   - {m}")
        print("\n=> Incomplete migration. It is self-healing: the migration is "
              "idempotent and\n   re-runs on every boot, so restarting the API "
              "repairs this.")
        return 4

    print("[4] SCHEMA   OK    all tables and migrated columns present")
    print("\n=> Database is fully healthy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
