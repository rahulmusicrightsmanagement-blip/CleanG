from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..core.limiter import limiter
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginRequest, UserOut
from ..security import create_access_token, verify_password

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


@router.post("/login", response_model=UserOut)
@limiter.limit(settings.login_rate_limit)
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate and issue a session as an httpOnly cookie.

    The token is never exposed to JavaScript (cookie is httpOnly), and repeated
    failures lock the account for a cooldown window to blunt brute force. The
    endpoint is also IP rate-limited via slowapi.
    """
    # A generic error for every auth failure — never reveal whether the email
    # exists, the password was wrong, or the account is disabled/locked.
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
    )
    now = datetime.now(timezone.utc)
    user = db.scalar(select(User).where(User.email == payload.email))

    if user is None:
        # Still spend a hash comparison-ish amount of work? Keep it simple: just
        # fail generically. (Timing is dominated by bcrypt below for real users.)
        raise invalid

    if user.locked_until is not None and user.locked_until > now:
        raise invalid

    if not verify_password(payload.password, user.hashed_password):
        user.failed_logins += 1
        if user.failed_logins >= settings.max_failed_logins:
            user.locked_until = now + timedelta(minutes=settings.lockout_minutes)
            user.failed_logins = 0
        db.commit()
        raise invalid

    if not user.is_active:
        raise invalid

    # Success — reset the lockout counters and issue the cookie.
    user.failed_logins = 0
    user.locked_until = None
    db.commit()

    token = create_access_token(str(user.id), user.token_version)
    _set_session_cookie(response, token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke the current session everywhere and clear the cookie."""
    current_user.token_version += 1
    db.commit()
    _clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
