"""Best-effort security audit logging.

`log_event` records an authentication or privileged action to the `audit_events`
table. It is deliberately defensive: an audit-write failure must never break the
request it is recording, so any error rolls back just the audit insert and is
swallowed. Callers pass either a resolved `user` or a raw `email` (failed logins
won't have a user); the client IP and User-Agent are pulled from the request.
"""

from sqlalchemy.orm import Session
from starlette.requests import Request

from ..models import AuditEvent, User
from .limiter import client_ip


def log_event(
    db: Session,
    request: Request | None,
    action: str,
    *,
    user: User | None = None,
    email: str | None = None,
    detail: str | None = None,
) -> None:
    ip = None
    agent = None
    if request is not None:
        try:
            ip = client_ip(request)
            agent = request.headers.get("user-agent")
        except Exception:
            pass
    try:
        db.add(
            AuditEvent(
                action=action,
                user_id=user.id if user is not None else None,
                email=(email or (user.email if user is not None else None)),
                ip=(ip or "")[:64] or None,
                user_agent=(agent or "")[:512] or None,
                detail=(detail or "")[:512] or None,
            )
        )
        db.commit()
    except Exception:
        # Audit logging is best-effort — never let it break the real operation.
        db.rollback()
