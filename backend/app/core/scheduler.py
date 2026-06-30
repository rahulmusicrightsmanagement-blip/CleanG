"""Daily-report scheduler.

A single APScheduler background job fires every day at the configured time
(default 10:30 Asia/Kolkata), builds the report and emails it. The job is
wrapped so any failure (SMTP down, etc.) is logged but never propagates.

`send_daily_report()` is also called directly by the manual /api/reports endpoint
so the report can be triggered on demand for testing.
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from ..config import (
    REPORT_ENABLED,
    REPORT_HOUR,
    REPORT_MINUTE,
    REPORT_TIMEZONE,
    get_settings,
)
from ..database import SessionLocal
from .mailer import send_email
from .report import build_report_rows, render_report

log = logging.getLogger("mrm.report")

_scheduler: BackgroundScheduler | None = None


def send_daily_report() -> dict:
    """Build the report from a fresh DB session and email it. Returns a summary."""
    db = SessionLocal()
    try:
        rows = build_report_rows(db)
    finally:
        db.close()
    subject, text_body, html_body = render_report(rows)
    recipients = send_email(subject, html_body, text_body)
    return {"files": len(rows), "recipients": recipients, "subject": subject}


def _safe_send() -> None:
    try:
        result = send_daily_report()
        log.info("Daily report sent: %s", result)
    except Exception:
        log.exception("Daily report failed to send")


def start_scheduler() -> None:
    global _scheduler
    if not REPORT_ENABLED:
        log.info("Daily report disabled.")
        return
    if not get_settings().smtp_configured:
        log.warning(
            "Daily report scheduler started but SMTP is not configured — "
            "set SMTP_HOST / SMTP_USER / SMTP_PASS in the environment to enable "
            "delivery."
        )
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone=REPORT_TIMEZONE)
    _scheduler.add_job(
        _safe_send,
        CronTrigger(hour=REPORT_HOUR, minute=REPORT_MINUTE, timezone=REPORT_TIMEZONE),
        id="daily_report",
        replace_existing=True,
        misfire_grace_time=3600,  # still send if the worker was briefly down
        coalesce=True,
    )
    _scheduler.start()
    log.info(
        "Daily report scheduled for %02d:%02d %s",
        REPORT_HOUR,
        REPORT_MINUTE,
        REPORT_TIMEZONE,
    )


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
