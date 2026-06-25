"""Shared rate limiter (slowapi). Keyed by client IP.

Defined in its own module so both the app factory (which registers the
middleware + error handler) and the routers (which decorate endpoints) can
import the same instance without a circular import.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from ..config import get_settings

settings = get_settings()


def client_ip(request: Request) -> str:
    """The real client IP, safe to use as a rate-limit key behind our nginx proxy.

    nginx sets `X-Forwarded-For` to `$proxy_add_x_forwarded_for`, i.e. it APPENDS
    the address it actually saw (`$remote_addr`) to whatever the client sent. So
    the RIGHTMOST entry is the peer nginx connected to and cannot be forged by the
    client (it can prepend fakes, but not strip the appended real one). We take
    that, falling back to the socket address when there's no proxy header. This is
    what stops every request from collapsing to nginx's own IP (one global bucket)
    or trusting a spoofable client-supplied value.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return get_remote_address(request)


# Keyed by the real client IP; storage is Redis when REDIS_URL is set, else
# per-process memory (the default, fine for a single worker / local dev).
limiter = Limiter(key_func=client_ip, storage_uri=settings.rate_limit_storage_uri)
