from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import User, UserRole
from .security import decode_access_token

settings = get_settings()

# auto_error=False: a missing Authorization header is fine because the token is
# normally delivered via the httpOnly session cookie instead.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def _extract_token(request: Request, bearer: str | None) -> str | None:
    # Prefer the httpOnly cookie (not reachable from JS, so XSS can't exfiltrate
    # it); fall back to a Bearer header for API/script clients.
    cookie = request.cookies.get(settings.cookie_name)
    return cookie or bearer


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    raw = _extract_token(request, token)
    if raw is None:
        raise credentials_error

    payload = decode_access_token(raw)
    if payload is None or "sub" not in payload:
        raise credentials_error

    try:
        user = db.get(User, int(payload["sub"]))
    except (TypeError, ValueError):
        raise credentials_error
    if user is None or not user.is_active:
        raise credentials_error
    # Reject tokens minted before the user's current version (revoked sessions).
    if payload.get("ver", 0) != user.token_version:
        raise credentials_error
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
