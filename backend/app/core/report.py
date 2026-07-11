"""Daily report: per-file cleaning/upload summary, rendered as text + HTML.

One row per uploaded file (all-time), with: upload date, source (the branch the
file was cleaned under), file name, rows uploaded, rows cleaned (the cleaning
engine's clean-&-ready count), rows manually corrected by a human reviewer,
rows committed into the master dataset, and who worked on it (the branch owner).

The "rows in master" figure comes from the activity log (inserted + updated per
commit), so it reflects what each file actually stored — de-duplication included.
"""

from __future__ import annotations

import html
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import ActivityLog, UploadedFile


@dataclass
class FileReportRow:
    upload_date: str
    source: str
    file_name: str
    rows_uploaded: int
    rows_cleaned: int
    rows_manual: int
    rows_in_master: int
    worked_by: str


def _master_counts_by_file(db: Session) -> dict[int, int]:
    """{file_id -> total records this file stored in master (inserted + updated)}."""
    rows = db.execute(
        select(
            ActivityLog.file_id,
            func.coalesce(func.sum(ActivityLog.inserted + ActivityLog.updated), 0),
        ).group_by(ActivityLog.file_id)
    ).all()
    return {fid: int(n) for fid, n in rows}


def build_report_rows(db: Session) -> list[FileReportRow]:
    """Compute the per-file report over every uploaded file (newest first)."""
    # Lazy import: the cleaning router pulls in a lot, and importing it at module
    # load time would create an import cycle (router -> core, core -> router).
    from ..routers.clean import _get_summary

    master_counts = _master_counts_by_file(db)
    files = (
        db.execute(select(UploadedFile).order_by(UploadedFile.created_at.desc()))
        .scalars()
        .all()
    )

    out: list[FileReportRow] = []
    for f in files:
        branch = f.branch
        owner = branch.owner if branch is not None else None
        try:
            cleaned = _get_summary(f).clean
        except Exception:
            # A file that can't be cleaned (e.g. never mapped) still belongs in
            # the report — just with 0 clean rows rather than crashing the digest.
            cleaned = 0
        out.append(
            FileReportRow(
                upload_date=f.created_at.strftime("%Y-%m-%d") if f.created_at else "—",
                source=branch.name if branch is not None else "—",
                file_name=f.original_name or "—",
                rows_uploaded=f.n_rows or 0,
                rows_cleaned=cleaned,
                rows_manual=len(f.corrections or {}),
                rows_in_master=master_counts.get(f.id, 0),
                worked_by=owner.full_name if owner is not None else "—",
            )
        )
    return out


_COLUMNS = [
    ("upload_date", "Upload date"),
    ("source", "Source"),
    ("file_name", "File"),
    ("rows_uploaded", "Rows uploaded"),
    ("rows_cleaned", "Rows cleaned"),
    ("rows_manual", "Manually reviewed"),
    ("rows_in_master", "Stored in master"),
    ("worked_by", "Worked by"),
]


def render_report(rows: list[FileReportRow]) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the report."""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    pretty_date = now.strftime("%A, %d %B %Y")
    subject = f"MRM Cleanser — Daily Report ({today}) — {len(rows)} files"

    totals = {
        "rows_uploaded": sum(r.rows_uploaded for r in rows),
        "rows_cleaned": sum(r.rows_cleaned for r in rows),
        "rows_manual": sum(r.rows_manual for r in rows),
        "rows_in_master": sum(r.rows_in_master for r in rows),
    }

    def fmt(n: int) -> str:
        return f"{n:,}"

    # --- plain text -------------------------------------------------------
    text_lines = [subject, "=" * len(subject), ""]
    if not rows:
        text_lines.append("No uploaded files yet.")
    else:
        for r in rows:
            text_lines += [
                f"• {r.source} / {r.file_name}",
                f"    Uploaded:          {r.upload_date}",
                f"    Rows uploaded:     {fmt(r.rows_uploaded)}",
                f"    Rows cleaned:      {fmt(r.rows_cleaned)}",
                f"    Manually reviewed: {fmt(r.rows_manual)}",
                f"    Stored in master:  {fmt(r.rows_in_master)}",
                f"    Worked by:         {r.worked_by}",
                "",
            ]
        text_lines += [
            "Totals:",
            f"    Rows uploaded:     {fmt(totals['rows_uploaded'])}",
            f"    Rows cleaned:      {fmt(totals['rows_cleaned'])}",
            f"    Manually reviewed: {fmt(totals['rows_manual'])}",
            f"    Stored in master:  {fmt(totals['rows_in_master'])}",
        ]
    text_body = "\n".join(text_lines)

    # --- HTML (table-based + inline styles for email-client safety) -------
    BRAND = "#047857"       # emerald
    BRAND_DARK = "#065f46"
    HEAD_BG = "#ecfdf5"     # light emerald
    BORDER = "#e5e7eb"
    TEXT = "#1f2937"
    MUTED = "#6b7280"
    ZEBRA = "#f9fafb"
    NUMERIC = {"rows_uploaded", "rows_cleaned", "rows_manual", "rows_in_master"}

    # Header cells.
    head_cells = "".join(
        f'<th style="padding:10px 14px;text-align:{"right" if key in NUMERIC else "left"};'
        f'font:600 12px/1.2 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;'
        f'color:{BRAND_DARK};border-bottom:2px solid {BRAND};white-space:nowrap;">'
        f"{html.escape(label)}</th>"
        for key, label in _COLUMNS
    )

    def cell(value, align="left", bold=False, color=TEXT):
        weight = "600" if bold else "400"
        return (
            f'<td style="padding:10px 14px;text-align:{align};border-bottom:1px solid {BORDER};'
            f'font:{weight} 14px/1.4 Arial,sans-serif;color:{color};">'
            f"{html.escape(str(value))}</td>"
        )

    if rows:
        body_rows = []
        for i, r in enumerate(rows):
            bg = f' style="background:{ZEBRA};"' if i % 2 else ""
            body_rows.append(
                f"<tr{bg}>"
                + cell(r.upload_date, color=MUTED)
                + cell(r.source, bold=True, color=BRAND_DARK)
                + cell(r.file_name)
                + cell(fmt(r.rows_uploaded), align="right")
                + cell(fmt(r.rows_cleaned), align="right")
                + cell(fmt(r.rows_manual), align="right")
                + cell(fmt(r.rows_in_master), align="right")
                + cell(r.worked_by)
                + "</tr>"
            )
        total_cell = (
            lambda v, align="left": f'<td style="padding:12px 14px;text-align:{align};'
            f'border-top:2px solid {BRAND};font:700 14px/1.4 Arial,sans-serif;color:{BRAND_DARK};">'
            f"{html.escape(str(v))}</td>"
        )
        total_row = (
            f'<tr style="background:{HEAD_BG};">'
            + total_cell("Totals")
            + total_cell("")
            + total_cell("")
            + total_cell(fmt(totals["rows_uploaded"]), "right")
            + total_cell(fmt(totals["rows_cleaned"]), "right")
            + total_cell(fmt(totals["rows_manual"]), "right")
            + total_cell(fmt(totals["rows_in_master"]), "right")
            + total_cell("")
            + "</tr>"
        )
        table = (
            '<table role="presentation" cellpadding="0" cellspacing="0" '
            'style="border-collapse:collapse;width:100%;">'
            f"<thead><tr>{head_cells}</tr></thead>"
            f"<tbody>{''.join(body_rows)}{total_row}</tbody></table>"
        )
    else:
        table = (
            f'<p style="font:14px Arial,sans-serif;color:{MUTED};margin:8px 0;">'
            "No uploaded files yet.</p>"
        )

    # Summary stat tiles (4-up).
    def tile(value, label, color=BRAND_DARK):
        return (
            '<td width="25%" style="padding:6px;" valign="top">'
            f'<div style="background:{HEAD_BG};border:1px solid {BORDER};border-radius:8px;'
            'padding:14px 12px;text-align:center;">'
            f'<div style="font:700 22px/1.1 Arial,sans-serif;color:{color};">{html.escape(str(value))}</div>'
            f'<div style="font:600 11px/1.3 Arial,sans-serif;letter-spacing:.04em;'
            f'text-transform:uppercase;color:{MUTED};margin-top:4px;">{html.escape(label)}</div>'
            "</div></td>"
        )

    tiles = (
        '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
        'style="border-collapse:collapse;margin:4px 0 20px;"><tr>'
        + tile(fmt(len(rows)), "Files")
        + tile(fmt(totals["rows_uploaded"]), "Rows uploaded")
        + tile(fmt(totals["rows_cleaned"]), "Rows cleaned", BRAND)
        + tile(fmt(totals["rows_in_master"]), "In master")
        + "</tr></table>"
    )

    html_body = f"""\
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f8;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="700" style="width:700px;max-width:100%;background:#ffffff;border:1px solid {BORDER};border-radius:12px;overflow:hidden;">
        <!-- header -->
        <tr><td style="background:{BRAND};padding:24px 28px;">
          <div style="font:700 20px/1.2 Arial,sans-serif;color:#ffffff;">🎵 MRM Cleanser</div>
          <div style="font:600 14px/1.4 Arial,sans-serif;color:#d1fae5;margin-top:2px;">Daily Cleaning Report</div>
          <div style="font:13px/1.4 Arial,sans-serif;color:#a7f3d0;margin-top:6px;">{html.escape(pretty_date)} · {len(rows)} file(s)</div>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:22px 28px 28px;">
          {tiles}
          {table}
        </td></tr>
        <!-- footer -->
        <tr><td style="background:#fafafa;border-top:1px solid {BORDER};padding:16px 28px;">
          <div style="font:12px/1.5 Arial,sans-serif;color:{MUTED};">
            Automated daily summary of every uploaded &amp; cleaned data file.<br>
            Sent by MRM Cleanser. Please do not reply to this email.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body
