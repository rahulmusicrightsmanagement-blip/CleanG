"""Persisting cleaned rows into the structured master dataset, with dedup.

A recording is stored exactly once. Re-uploading the same row from another
branch does NOT add a new row (no storage bloat). The one allowed difference is
ownership: a song can be sold to a different Label / Publisher / Distributor, so
when every identity field matches but an ownership field changed, the existing
row is updated in place to the latest owner instead of being duplicated.
"""

import hashlib
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import MASTER_COLUMN_TO_ATTR, MasterData

# Ownership/rights fields that may legitimately change while the recording stays
# the same record — these are excluded from the identity hash and, when they
# differ on an otherwise-identical row, drive an in-place "store the latest" update.
OWNERSHIP_FIELDS = ("Label", "Publisher", "Distributor")

# Excluded from the identity fingerprint: the serial Record # (a per-file
# position, not part of a recording's identity) plus the ownership fields.
_IDENTITY_EXCLUDE = {"Record #", *OWNERSHIP_FIELDS}

# Master columns that take part in the identity hash, in a fixed order.
_IDENTITY_COLUMNS = [c for c in MASTER_COLUMN_TO_ATTR if c not in _IDENTITY_EXCLUDE]


def _norm(v) -> str:
    return re.sub(r"\s+", " ", str(v or "").strip()).lower()


def fingerprint(values: dict) -> str:
    """Stable identity hash for a cleaned row (ownership + serial excluded)."""
    payload = "".join(f"{c}{_norm(values.get(c))}" for c in _IDENTITY_COLUMNS)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _row_attrs(values: dict) -> dict:
    """Map a cleaned row (keyed by master column name) onto MasterData attrs."""
    return {
        attr: (values.get(col) or "")
        for col, attr in MASTER_COLUMN_TO_ATTR.items()
    }


def _ownership_differs(existing: MasterData, values: dict) -> bool:
    for col in OWNERSHIP_FIELDS:
        attr = MASTER_COLUMN_TO_ATTR.get(col)
        if attr is None:
            continue  # field not part of this schema (e.g. Publisher)
        if _norm(getattr(existing, attr)) != _norm(values.get(col)):
            return True
    return False


# Fetch existing records in chunks so the IN(...) parameter list stays sane on
# very large saves (a single huge IN clause can be rejected / slow).
_FETCH_CHUNK = 1000


def upsert_master_records(
    db: Session, branch_id: int, file_id: int, rows: list[dict]
) -> dict:
    """Store clean rows into `master_data`, de-duplicating against what's there.

    Returns counts: {inserted, updated, duplicates}. `duplicates` are rows whose
    identity AND ownership already match an existing record (nothing stored).

    Bulk by design: existing records are read in a couple of queries (not one
    per row), so a multi-thousand-row save is a handful of round-trips rather
    than thousands — what was previously timing out the request.
    """
    inserted = updated = duplicates = 0

    # Fingerprint every row once, then load all already-stored matches up front.
    fps = [fingerprint(v) for v in rows]
    unique_fps = list(dict.fromkeys(fps))
    existing: dict[str, MasterData] = {}
    for i in range(0, len(unique_fps), _FETCH_CHUNK):
        chunk = unique_fps[i : i + _FETCH_CHUNK]
        for m in db.scalars(
            select(MasterData).where(MasterData.fingerprint.in_(chunk))
        ):
            existing[m.fingerprint] = m

    pending: dict[str, MasterData] = {}  # new rows created in this batch
    for values, fp in zip(rows, fps):
        target = existing.get(fp) or pending.get(fp)
        if target is None:
            obj = MasterData(
                branch_id=branch_id,
                file_id=file_id,
                fingerprint=fp,
                **_row_attrs(values),
            )
            pending[fp] = obj
            inserted += 1
        elif _ownership_differs(target, values):
            # Same recording, new owner -> keep the latest values (and source refs).
            for attr, val in _row_attrs(values).items():
                setattr(target, attr, val)
            target.branch_id = branch_id
            target.file_id = file_id
            updated += 1
        else:
            duplicates += 1

    db.add_all(pending.values())  # one batched INSERT, committed by the caller
    return {"inserted": inserted, "updated": updated, "duplicates": duplicates}


def record_to_dict(rec: MasterData, columns: list[str] | None = None) -> dict:
    """A master row as {master column name: value}, optionally projected to
    just `columns` — this is how any required field is extracted on demand."""
    cols = columns or list(MASTER_COLUMN_TO_ATTR)
    out = {}
    for col in cols:
        attr = MASTER_COLUMN_TO_ATTR.get(col)
        if attr is not None:
            out[col] = getattr(rec, attr)
    return out
