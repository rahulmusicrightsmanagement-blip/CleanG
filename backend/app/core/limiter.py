"""Shared rate limiter (slowapi). Keyed by client IP.

Defined in its own module so both the app factory (which registers the
middleware + error handler) and the routers (which decorate endpoints) can
import the same instance without a circular import.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
