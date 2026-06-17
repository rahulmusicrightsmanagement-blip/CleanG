from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment / .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str = "change-me-to-a-long-random-secret"
    access_token_expire_minutes: int = 720
    algorithm: str = "HS256"

    admin_email: str = "admin@mrmcleanser.com"
    admin_password: str = "change-me-admin-password"
    admin_name: str = "Administrator"

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
