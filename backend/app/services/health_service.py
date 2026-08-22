from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine
from app.models.ops import STATUS_DEGRADED, STATUS_HEALTHY, STATUS_UNHEALTHY, STATUS_UNKNOWN

log = logging.getLogger(__name__)


def check_database() -> dict[str, str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": STATUS_HEALTHY}
    except Exception:
        log.error("Database health check failed", exc_info=True)
        return {"status": STATUS_UNHEALTHY}


def _check_r2_storage() -> dict[str, str]:
    from app.services.media_service import _r2_client, r2_configured

    if not r2_configured():
        return {"status": STATUS_UNHEALTHY}
    try:
        settings = get_settings()
        _r2_client().head_bucket(Bucket=settings.storage_bucket)
        return {"status": STATUS_HEALTHY}
    except Exception:
        log.error("Storage health check failed", exc_info=True)
        return {"status": STATUS_UNHEALTHY}


def check_storage() -> dict[str, str]:
    settings = get_settings()
    provider = (settings.storage_provider or "local").strip().lower()
    if provider == "r2":
        return _check_r2_storage()
    if provider not in {"local", "filesystem", ""}:
        bucket = (settings.storage_bucket or "").strip()
        if not bucket:
            return {"status": STATUS_UNKNOWN}
        return {"status": STATUS_HEALTHY}
    root = Path(settings.storage_dir)
    try:
        root.mkdir(parents=True, exist_ok=True)
        probe = root / ".healthcheck"
        probe.write_text("ok", encoding="utf-8")
        if not probe.exists():
            return {"status": STATUS_UNHEALTHY}
        return {"status": STATUS_HEALTHY}
    except Exception:
        log.error("Storage health check failed", exc_info=True)
        return {"status": STATUS_UNHEALTHY}


def overall_status(database: str, storage: str) -> str:
    if database == STATUS_UNHEALTHY:
        return STATUS_UNHEALTHY
    if storage == STATUS_UNHEALTHY:
        return STATUS_DEGRADED
    if STATUS_UNKNOWN in {database, storage}:
        return STATUS_UNKNOWN if database == STATUS_UNKNOWN else STATUS_DEGRADED
    return STATUS_HEALTHY
