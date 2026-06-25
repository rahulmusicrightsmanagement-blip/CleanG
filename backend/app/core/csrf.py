"""CSRF protection via the double-submit-cookie pattern.

The session lives in an httpOnly cookie the browser sends automatically, which is
exactly what a cross-site request forgery abuses. To stop it we also issue a
*readable* CSRF cookie at login; the SPA echoes its value back in a request
header on every state-changing call, and the server requires the header to equal
the cookie. A cross-site page can cause the session cookie to ride along but
cannot read the CSRF cookie (same-origin policy), so it cannot forge the header.

Enforcement rules:
  - Safe methods (GET/HEAD/OPTIONS) are never checked.
  - Login is exempt — there is no session yet, and it is what mints the tokens.
  - The check only applies when the request carries the *session cookie*. A
    request authenticated by a Bearer header (scripts / API clients) is not a
    CSRF vector and is left alone, as is any unauthenticated request (the route's
    own auth dependency rejects it).
"""

import hmac
import secrets

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from ..config import get_settings

settings = get_settings()

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
# Paths allowed to perform an unsafe method without a CSRF token.
_EXEMPT_PATHS = frozenset({"/api/auth/login"})


def issue_csrf_token() -> str:
    """A fresh, unguessable CSRF token."""
    return secrets.token_urlsafe(32)


def _needs_check(request: Request) -> bool:
    if request.method in _SAFE_METHODS:
        return False
    if request.url.path in _EXEMPT_PATHS:
        return False
    # Only cookie-authenticated requests are CSRF-prone.
    return settings.cookie_name in request.cookies


async def csrf_protect(request: Request, call_next) -> Response:
    """Starlette middleware enforcing the double-submit check."""
    if _needs_check(request):
        header = request.headers.get(settings.csrf_header_name, "")
        cookie = request.cookies.get(settings.csrf_cookie_name, "")
        # Constant-time compare; both must be present and equal.
        if not header or not cookie or not hmac.compare_digest(header, cookie):
            return JSONResponse(
                {"detail": "CSRF token missing or invalid."},
                status_code=403,
            )
    return await call_next(request)
