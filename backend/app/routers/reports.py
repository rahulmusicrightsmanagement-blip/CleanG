"""Report endpoints: trigger the daily summary email on demand (admin only)."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..core.audit import log_event
from ..core.scheduler import send_daily_report
from ..database import get_db
from ..deps import require_admin
from ..models import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/daily/send")
def send_daily_report_now(
    request: Request,
    db=Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Build and email the daily report immediately (for testing the schedule)."""
    try:
        result = send_daily_report()
    except RuntimeError as e:
        # Configuration problem (SMTP not set) — surface it clearly.
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Failed to send report: {e}"
        )
    log_event(
        db, request, "report_sent", user=admin,
        detail=f"{result['files']} files -> {', '.join(result['recipients'])}",
    )
    return result
