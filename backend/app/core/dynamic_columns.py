"""Custom (user-added) master columns as REAL `master_data` columns.

A custom column added on the mapping screen becomes a genuine ``VARCHAR`` column
on ``master_data`` (created by ``ALTER TABLE``), not an entry in a JSON bag. Its
physical name (``attr``) is recorded on the ``master_columns`` row and attached to
the ``MasterData`` ORM mapper at runtime, so it reads and writes exactly like a
built-in column (``getattr(rec, attr)``, ``MasterData(**{attr: value})``).

This module owns the two safety-critical pieces: deriving an injection-proof
physical column name, and keeping the ORM mapper in sync with the columns that
actually exist in the database.
"""

import re

from sqlalchemy import Column, String, select
from sqlalchemy.orm import Session

from ..models import MASTER_COLUMN_TO_ATTR, MasterColumn, MasterData

# A physical column name must match this exactly before it is ever put into DDL.
# It is the injection guard: anything else raises rather than reaching SQL.
_ATTR_RE = re.compile(r"^[a-z][a-z0-9_]*$")
# Attribute names the built-in schema already uses — a custom column never reuses one.
_BUILTIN_ATTRS = set(MASTER_COLUMN_TO_ATTR.values())
_MAX_IDENT = 63  # PostgreSQL identifier length limit.


def make_attr(name: str, taken: set[str]) -> str:
    """Derive a safe, unique physical column name for a custom master column.

    Sanitised to snake_case and prefixed ``x_`` so it can never collide with a
    built-in attribute or a SQL keyword, then disambiguated with a numeric suffix
    against `taken`. The result is validated before being returned.
    """
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    base = (f"x_{slug}"[:_MAX_IDENT]).rstrip("_") or "x_col"
    reserved = _BUILTIN_ATTRS | taken
    attr, n = base, 1
    while attr in reserved:
        suffix = f"_{n}"
        attr = f"{base[:_MAX_IDENT - len(suffix)]}{suffix}"
        n += 1
    if not _ATTR_RE.match(attr):
        raise ValueError(f"Could not derive a safe column name from {name!r}")
    return attr


def quote_ident(attr: str) -> str:
    """Double-quote a physical column name for use in DDL, re-validating first."""
    if not _ATTR_RE.match(attr):
        raise ValueError(f"Unsafe identifier: {attr!r}")
    return f'"{attr}"'


def attach_custom_column(attr: str) -> None:
    """Make an existing `master_data` column visible to the MasterData ORM mapper.

    Idempotent — attaching an already-known column is a no-op. After this,
    ``getattr(rec, attr)`` and ``MasterData(**{attr: ...})`` behave like a
    built-in column. Only call once the DB column is known to exist.
    """
    if attr in MasterData.__table__.c:
        return
    col = Column(attr, String, nullable=False, server_default="")
    MasterData.__table__.append_column(col)
    MasterData.__mapper__.add_property(attr, col)


def sync_custom_columns(db: Session) -> None:
    """Attach every custom column recorded in `master_columns` to the ORM.

    Cheap and idempotent — called at startup and at the top of any path that
    reads or writes custom columns, so each process self-heals if a column was
    added by another worker."""
    for attr in db.scalars(
        select(MasterColumn.attr).where(
            MasterColumn.custom.is_(True), MasterColumn.attr.is_not(None)
        )
    ):
        if attr:
            attach_custom_column(attr)


def master_column_attrs(db: Session) -> dict[str, str]:
    """``{master column name -> physical attr}`` for built-in AND custom columns.

    Built-ins come from the static schema; custom columns from ``master_columns``.
    Also attaches any not-yet-known custom column to the ORM as a side effect, so
    callers can immediately ``getattr`` the resolved attribute."""
    out = dict(MASTER_COLUMN_TO_ATTR)
    for name, attr in db.execute(
        select(MasterColumn.name, MasterColumn.attr).where(
            MasterColumn.custom.is_(True), MasterColumn.attr.is_not(None)
        )
    ):
        if attr and name not in out:
            attach_custom_column(attr)
            out[name] = attr
    return out
