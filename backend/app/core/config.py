from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "change-me-in-production"
    database_url: str = "sqlite:///./dev.db"
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    platform_domain: str = "schoolplatform.com"
    default_tenant_slug: str = "belair-high"
    allow_tenant_query_override: bool = False
    storage_provider: str = "local"
    storage_bucket: str = ""
    storage_dir: str = "./storage"
    media_trash_dir: str = "./media-trash"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 12
    backup_dir: str = "./backups"
    backup_mode: str = "local"
    backup_retention_daily_days: int = 14
    backup_retention_weekly_weeks: int = 4
    backup_retention_monthly_months: int = 3
    backup_overdue_hours: int = 26
    slow_request_ms: int = 1000
    sentry_dsn: str = ""
    ops_alert_webhook: str = ""
    log_json: str = ""
    login_fail_window_seconds: int = 600
    login_fail_threshold: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment.lower() in {"development", "dev", "local", "test"}

    @property
    def is_test(self) -> bool:
        return self.environment.lower() == "test"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def use_json_logs(self) -> bool:
        raw = (self.log_json or "").strip().lower()
        if raw in {"1", "true", "yes", "json"}:
            return True
        if raw in {"0", "false", "no", "text"}:
            return False
        return not self.is_development

    @property
    def backup_provider_managed(self) -> bool:
        return self.backup_mode.strip().lower() in {"provider", "managed", "native"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
