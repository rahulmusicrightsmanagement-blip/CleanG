import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

settings = get_settings()


def _normalize_url(url: str) -> str:
    """Use the psycopg3 driver for plain postgres URLs (e.g. Neon strings)."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


# Connection resilience. Without a connect_timeout, a single database blip makes
# every connection attempt hang indefinitely — including the one in the startup
# lifespan — which leaves the API "up" but wedged (permanent 502) long after the
# database has recovered. A bounded timeout turns that into a fast, retryable
# error instead. All values are env-overridable so they can be tuned per deploy.
#
# The default is generous (30s) because the remote Postgres this deploys against
# has a slow, variable TCP-accept-to-handshake latency: it often connects in a few
# seconds but intermittently needs >10s. A 10s cap made every startup retry (and
# random live requests) time out even though the database was reachable, wedging
# the API. 30s stays bounded (so a true outage still fails fast enough to retry)
# while tolerating this database's slow handshake.
_CONNECT_TIMEOUT = _int_env("DB_CONNECT_TIMEOUT", 30)

_connect_args: dict[str, object] = {"connect_timeout": _CONNECT_TIMEOUT}

# Server-side guard: auto-close a connection left idle inside a transaction (a
# leaked session from a crashed worker) so it can't hold a slot forever and
# exhaust the database's connection limit.
#
# It is sent as a libpq `options` startup parameter, which a connection POOLER
# will not accept: PgBouncer (which is what Neon's `-pooler` endpoint runs)
# rejects the connection outright with "unsupported startup parameter in
# options". So it is only sent on a direct connection. Nothing is lost by
# dropping it there — the pooler is itself what recycles idle connections.
_is_pooled = "-pooler" in settings.database_url or "pgbouncer" in settings.database_url
if not _is_pooled:
    _connect_args["options"] = "-c idle_in_transaction_session_timeout=" + str(
        _int_env("DB_IDLE_TX_TIMEOUT_MS", 60000)
    )

# pool_pre_ping keeps Neon's serverless connections healthy across idle periods
# (it scales an idle branch to zero, so a pooled connection can be dead on reuse).
# The pool is bounded so a burst of concurrent requests can't open unbounded
# connections and exhaust the database's connection limit.
engine = create_engine(
    _normalize_url(settings.database_url),
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=_int_env("DB_POOL_SIZE", 5),
    max_overflow=_int_env("DB_MAX_OVERFLOW", 10),
    pool_timeout=_int_env("DB_POOL_TIMEOUT", 30),
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
