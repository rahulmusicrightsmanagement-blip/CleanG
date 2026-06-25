
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt import PyJWTError

from .config import get_settings

settings = get_settings()


def _encode(password: str) -> bytes:
    # bcrypt only uses the first 72 bytes; truncate to stay within its limit.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode("utf-8")


# A fixed bcrypt hash of a random, unknowable password. The login flow verifies
# the submitted password against THIS when the email doesn't exist, so a missing
# account costs the same bcrypt work as a real one — closing the timing channel
# that would otherwise reveal which emails are registered. Computed once at import.
DUMMY_PASSWORD_HASH = hash_password(uuid.uuid4().hex)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_encode(plain), hashed.encode("utf-8"))


def create_access_token(subject: str, token_version: int = 0) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "jti": uuid.uuid4().hex,
        # Bumping a user's token_version (logout / deactivate / password reset)
        # invalidates every token minted before the bump.
        "ver": token_version,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    """Return the token payload, or None if invalid/expired.

    `algorithms` is pinned to a single symmetric algorithm so a token forged with
    `alg: none` or an asymmetric-key confusion trick is rejected. Expiry and the
    presence of `sub`/`exp` are required, so a malformed/expired token never
    resolves to a user.
    """
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"require": ["exp", "sub"]},
        )
    except PyJWTError:
        return None
