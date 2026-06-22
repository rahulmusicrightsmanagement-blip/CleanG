import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class FileStatus(str, enum.Enum):
    uploaded = "uploaded"   # validated + rows extracted, mapping suggested
    mapped = "mapped"       # mapping confirmed by the user
    cleaned = "cleaned"     # cleaning engine has run
    committed = "committed"  # clean rows saved to the master records


class BranchStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.user
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    # Bumped on logout / deactivate / password reset to revoke outstanding tokens.
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    # Brute-force lockout bookkeeping.
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    branches: Mapped[list["Branch"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Branch(Base):
    """A workspace created per cleaning request. Each new request = a new branch."""

    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[BranchStatus] = mapped_column(
        Enum(BranchStatus, name="branch_status"), default=BranchStatus.active
    )
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="branches")
    files: Mapped[list["UploadedFile"]] = relationship(
        back_populates="branch", cascade="all, delete-orphan"
    )


class MasterColumn(Base):
    """The canonical output schema, seeded from the master format workbook.

    The final cleaned sheet conforms to these columns, in this order.
    """

    __tablename__ = "master_columns"

    id: Mapped[int] = mapped_column(primary_key=True)
    position: Mapped[int] = mapped_column(Integer, unique=True)
    name: Mapped[str] = mapped_column(String(255))


class UploadedFile(Base):
    """An input file uploaded into a branch, plus its validation + mapping state."""

    __tablename__ = "uploaded_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))
    original_name: Mapped[str] = mapped_column(String(512))
    size_bytes: Mapped[int] = mapped_column(Integer)
    sheet_name: Mapped[str] = mapped_column(String(255))
    header_row: Mapped[int] = mapped_column(Integer, default=1)
    n_columns: Mapped[int] = mapped_column(Integer)
    n_rows: Mapped[int] = mapped_column(Integer)
    headers: Mapped[list] = mapped_column(JSON)
    # The extracted rows themselves — we do NOT keep the original file on disk.
    data: Mapped[list] = mapped_column(JSON, default=list)
    # Master-centric mapping:
    #   [{master_column, position, input_header, extra_headers, confidence, method, needs_review}]
    # `extra_headers` lets several input columns feed one master column (merged at clean time).
    mapping: Mapped[list] = mapped_column(JSON, default=list)
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    # Human review overlay. Cleaning is computed in memory from `data` + `mapping`;
    # only the cells a reviewer changed are persisted here, keyed by row index:
    #   {"<row_index>": {"<master_column>": "value", ...}}
    corrections: Mapped[dict] = mapped_column(JSON, default=dict)
    # Row indexes the reviewer dropped (excluded from output and the master save).
    dropped: Mapped[list] = mapped_column(JSON, default=list)
    # Row indexes the reviewer accepted as-is: their flags are cleared and the
    # values kept unchanged (a deliberate "keep this data" override).
    accepted: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[FileStatus] = mapped_column(
        Enum(FileStatus, name="file_status"), default=FileStatus.uploaded
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    branch: Mapped["Branch"] = relationship(back_populates="files")


class MasterRecord(Base):
    """Legacy committed-record table (JSON blob). Kept for backward compatibility;
    new commits write to the structured `master_data` table instead."""

    __tablename__ = "master_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))
    file_id: Mapped[int] = mapped_column(ForeignKey("uploaded_files.id"))
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# The canonical master schema, in order. Each master column maps to a stable
# snake_case attribute so cleaned rows land in real, queryable columns (not a
# JSON blob) — this is what lets us extract any single field efficiently.
MASTER_COLUMN_TO_ATTR: dict[str, str] = {
    "Record #": "record_no",
    "Label": "label",
    "ISRC": "isrc",
    "Date Submitted": "date_submitted",
    "UPC": "upc",
    "Album cat. No.": "album_cat_no",
    "Album Name": "album_name",
    "Track Name": "track_name",
    "Release Date": "release_date",
    "Singer": "singer",
    "Audio Duration (mm:sec)": "audio_duration",
    "Content Type": "content_type",
    "Vocal / Instrumental": "vocal_instrumental",
    "Language": "language",
    "Genre": "genre",
    "Lyricist": "lyricist",
    "Composer": "composer",
    "Territory Rights": "territory_rights",
    "God Name": "god_name",
    "Audio folder (path)": "audio_folder",
    "JPG folder (path)": "jpg_folder",
    "LRC File (path)": "lrc_file",
    "Lyrical Video (path)": "lyrical_video",
    "Go Live Date": "go_live_date",
    "Revenue Share": "revenue_share",
    "Revenue Split": "revenue_split",
    "Distributor": "distributor",
    "Territory Restriction": "territory_restriction",
    "Lead Artist": "lead_artist",
    "Agreement No.": "agreement_no",
}
MASTER_ATTR_TO_COLUMN: dict[str, str] = {v: k for k, v in MASTER_COLUMN_TO_ATTR.items()}


class MasterData(Base):
    """A committed, fully-clean record stored as structured columns.

    One row per distinct recording. `fingerprint` is the dedup key — a hash of
    every identity field (everything except the serial Record # and the
    ownership fields that may legitimately change). A second upload of the same
    recording is therefore not stored again; if only the Label / Publisher /
    Distributor changed (e.g. the song was sold on), the existing row is updated
    in place to the latest owner rather than duplicated.
    """

    __tablename__ = "master_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Activity-log link: which branch + file most recently wrote this record.
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), index=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("uploaded_files.id"))
    # Stable identity hash (everything except serial + ownership fields).
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    record_no: Mapped[str] = mapped_column(String, default="")
    label: Mapped[str] = mapped_column(String, default="", index=True)
    isrc: Mapped[str] = mapped_column(String, default="", index=True)
    date_submitted: Mapped[str] = mapped_column(String, default="")
    upc: Mapped[str] = mapped_column(String, default="", index=True)
    album_cat_no: Mapped[str] = mapped_column(String, default="")
    album_name: Mapped[str] = mapped_column(String, default="", index=True)
    track_name: Mapped[str] = mapped_column(String, default="", index=True)
    release_date: Mapped[str] = mapped_column(String, default="")
    singer: Mapped[str] = mapped_column(String, default="")
    audio_duration: Mapped[str] = mapped_column(String, default="")
    content_type: Mapped[str] = mapped_column(String, default="")
    vocal_instrumental: Mapped[str] = mapped_column(String, default="")
    language: Mapped[str] = mapped_column(String, default="")
    genre: Mapped[str] = mapped_column(String, default="")
    lyricist: Mapped[str] = mapped_column(String, default="")
    composer: Mapped[str] = mapped_column(String, default="")
    territory_rights: Mapped[str] = mapped_column(String, default="")
    god_name: Mapped[str] = mapped_column(String, default="")
    audio_folder: Mapped[str] = mapped_column(String, default="")
    jpg_folder: Mapped[str] = mapped_column(String, default="")
    lrc_file: Mapped[str] = mapped_column(String, default="")
    lyrical_video: Mapped[str] = mapped_column(String, default="")
    go_live_date: Mapped[str] = mapped_column(String, default="")
    revenue_share: Mapped[str] = mapped_column(String, default="")
    revenue_split: Mapped[str] = mapped_column(String, default="")
    distributor: Mapped[str] = mapped_column(String, default="", index=True)
    territory_restriction: Mapped[str] = mapped_column(String, default="")
    lead_artist: Mapped[str] = mapped_column(String, default="")
    agreement_no: Mapped[str] = mapped_column(String, default="")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ActivityLog(Base):
    """Per-commit audit trail, keyed by the branch the data was stored from."""

    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), index=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("uploaded_files.id"))
    action: Mapped[str] = mapped_column(String(64), default="commit")
    inserted: Mapped[int] = mapped_column(Integer, default=0)
    updated: Mapped[int] = mapped_column(Integer, default=0)
    duplicates: Mapped[int] = mapped_column(Integer, default=0)
    skipped_errors: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
