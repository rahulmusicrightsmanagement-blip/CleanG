from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder values shipped in .env.example. Booting with any of these in a
# real deployment is a critical risk (forgeable tokens / known admin password),
# so startup is aborted if they are detected.
_PLACEHOLDER_SECRETS = {
    "",
    "change-me-to-a-long-random-secret",
    "change-me-admin-password",
    "12345678",
}


class Settings(BaseSettings):
    """Application configuration loaded from environment / .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60  # short-lived session token
    algorithm: str = "HS256"

    admin_email: str = "admin@mrmcleanser.com"
    admin_password: str
    admin_name: str = "Administrator"

    cors_origins: str = "http://localhost:5173"

    # Session cookie hardening. `cookie_secure` MUST stay true in production
    # (cookie only sent over HTTPS); set COOKIE_SECURE=false only for local
    # plain-HTTP development.
    cookie_secure: bool = True
    cookie_samesite: str = "lax"
    cookie_name: str = "mrm_session"

    # Brute-force protection on the login endpoint.
    login_rate_limit: str = "10/minute"
    max_failed_logins: int = 5
    lockout_minutes: int = 15

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _reject_placeholder_secrets(self) -> "Settings":
        if self.secret_key in _PLACEHOLDER_SECRETS or len(self.secret_key) < 32:
            raise ValueError(
                "SECRET_KEY is unset, a known placeholder, or too short. "
                "Generate a strong value, e.g. `python -c \"import secrets; "
                "print(secrets.token_urlsafe(64))\"`, and set it in the environment."
            )
        if self.admin_password in _PLACEHOLDER_SECRETS or len(self.admin_password) < 12:
            raise ValueError(
                "ADMIN_PASSWORD is unset, a known placeholder, or shorter than 12 "
                "characters. Set a strong bootstrap admin password in the environment."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
