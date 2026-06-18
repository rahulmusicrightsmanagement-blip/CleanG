"""Export presets + filter fields for the master dataset.

A preset is an ordered subset of the master columns. The columns NOT in a preset
become its "custom" columns — the extras a user can append to the end of the
preset at export time. A fully custom export lets the user pick any columns.
"""

from ..models import MASTER_COLUMN_TO_ATTR

# Full master schema in canonical order.
ALL_COLUMNS = list(MASTER_COLUMN_TO_ATTR)

# PDL = the master schema minus the three media-path columns.
PDL_COLUMNS = [
    "Record #", "Label", "ISRC", "Date Submitted", "UPC", "Album cat. No.",
    "Album Name", "Track Name", "Release Date", "Singer",
    "Audio Duration (mm:sec)", "Content Type", "Vocal / Instrumental",
    "Language", "Genre", "Lyricist", "Composer", "Territory Rights", "God Name",
    "Audio folder (path)", "Go Live Date", "Revenue Share", "Revenue Split",
    "Distributor", "Territory Restriction", "Lead Artist", "Agreement No.",
]

# SVF = the complete master schema (all 30 columns).
SVF_COLUMNS = list(ALL_COLUMNS)

PRESETS: dict[str, dict] = {
    "PDL": {"label": "PDL", "columns": PDL_COLUMNS},
    "SVF": {"label": "SVF", "columns": SVF_COLUMNS},
}

# Fields the user can pre-filter the data on. A field searches one OR MORE master
# columns (matched as "contains", OR across the columns) — e.g. "Artist Name"
# covers both Lead Artist and Singer, since the performing artist is often stored
# as the singer. The label doubles as the field key sent back in `filters`.
FILTER_FIELDS: list[tuple[str, list[str]]] = [
    ("Artist Name", ["Lead Artist", "Singer"]),
    ("Album Name", ["Album Name"]),
    ("Track Name", ["Track Name"]),
    ("Singer", ["Singer"]),
    ("Label", ["Label"]),
    ("Content Type", ["Content Type"]),
    ("Vocal / Instrumental", ["Vocal / Instrumental"]),
    ("Language", ["Language"]),
    ("Genre", ["Genre"]),
    ("Lyricist", ["Lyricist"]),
    ("Composer", ["Composer"]),
    ("Distributor", ["Distributor"]),
]

# {field label/key: [master columns it searches]}
FILTER_FIELD_COLUMNS: dict[str, list[str]] = {label: cols for label, cols in FILTER_FIELDS}

# Separator used by the cleaning engine when several names share one cell.
NAME_SEP = " | "

# Fail fast on a typo: every preset / filter column must be a real master column.
for _key, _p in PRESETS.items():
    _bad = [c for c in _p["columns"] if c not in MASTER_COLUMN_TO_ATTR]
    if _bad:
        raise ValueError(f"Preset {_key} references unknown columns: {_bad}")
for _label, _cols in FILTER_FIELDS:
    _bad = [c for c in _cols if c not in MASTER_COLUMN_TO_ATTR]
    if _bad:
        raise ValueError(f"Filter field {_label} -> unknown columns {_bad}")


def preset_payload() -> list[dict]:
    """Preset descriptors for the UI: base columns + the leftover custom columns."""
    out = []
    for key, p in PRESETS.items():
        base = p["columns"]
        custom = [c for c in ALL_COLUMNS if c not in base]
        out.append(
            {"key": key, "label": p["label"], "columns": base, "custom_columns": custom}
        )
    return out
