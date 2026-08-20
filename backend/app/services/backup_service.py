from __future__ import annotations

import logging
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.sanitize import sanitize_text
from app.db.session import engine
from app.models.ops import (
    BACKUP_FAILED,
    BACKUP_RUNNING,
    BACKUP_SUCCESS,
    BACKUP_TYPE_FULL,
    CATEGORY_BACKUP,
    SEVERITY_CRITICAL,
    SEVERITY_INFO,
    SEVERITY_WARNING,
    STATUS_DEGRADED,
    STATUS_HEALTHY,
    STATUS_UNHEALTHY,
    STATUS_UNKNOWN,
    BackupRun,
)
from app.services.system_events import record_event
from app.util.jsonutil import dumps, loads

log = logging.getLogger(__name__)

BACKUP_STARTED = "BACKUP_STARTED"
BACKUP_COMPLETED = "BACKUP_COMPLETED"
BACKUP_FAILED_EVENT = "BACKUP_FAILED"
BACKUP_OVERDUE = "BACKUP_OVERDUE"
RESTORE_STARTED = "RESTORE_STARTED"
RESTORE_COMPLETED = "RESTORE_COMPLETED"
RESTORE_FAILED = "RESTORE_FAILED"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _env_backup_root(settings=None) -> Path:
    settings = settings or get_settings()
    root = Path(settings.backup_dir).resolve() / settings.environment
    root.mkdir(parents=True, exist_ok=True)
    return root


def sqlite_file(database_url: str | None = None) -> Path | None:
    url = make_url(database_url or get_settings().database_url)
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        return None
    return Path(url.database).resolve()


def _dir_size(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for item in path.rglob("*"):
        if item.is_file():
            total += item.stat().st_size
    return total


def _checkpoint_sqlite() -> None:
    if sqlite_file() is None:
        return
    try:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
            conn.commit()
    except Exception:
        log.warning("SQLite WAL checkpoint skipped", exc_info=True)


def _copy_sqlite(dest_dir: Path) -> dict[str, str]:
    source = sqlite_file()
    if source is None:
        raise RuntimeError("SQLite file backup is not available for this database URL")
    if not source.exists():
        raise FileNotFoundError("Database file was not found")
    _checkpoint_sqlite()
    target = dest_dir / "database.db"
    try:
        shutil.copy2(source, target)
    except OSError:
        import sqlite3

        src = sqlite3.connect(str(source))
        dst = sqlite3.connect(str(target))
        try:
            with dst:
                src.backup(dst)
        finally:
            src.close()
            dst.close()
    for suffix in ("-wal", "-shm"):
        sidecar = Path(str(source) + suffix)
        if sidecar.exists():
            shutil.copy2(sidecar, dest_dir / f"database.db{suffix}")
    return {"databaseFile": str(target)}


def _copy_media(dest_dir: Path) -> dict[str, str]:
    settings = get_settings()
    storage = Path(settings.storage_dir)
    media_dest = dest_dir / "media"
    if storage.exists():
        shutil.copytree(storage, media_dest, dirs_exist_ok=True)
    else:
        media_dest.mkdir(parents=True, exist_ok=True)
    trash = Path(settings.media_trash_dir)
    if trash.exists():
        shutil.copytree(trash, dest_dir / "media-trash", dirs_exist_ok=True)
    return {"mediaDir": str(media_dest)}


def should_retain(started: datetime, now: datetime, settings=None) -> bool:
    settings = settings or get_settings()
    age = now - started
    if age <= timedelta(days=max(settings.backup_retention_daily_days, 1)):
        return True
    if started.weekday() == 6 and age <= timedelta(weeks=max(settings.backup_retention_weekly_weeks, 1)):
        return True
    if started.day == 1 and age <= timedelta(days=max(settings.backup_retention_monthly_months, 1) * 31):
        return True
    return False


def apply_retention(db: Session, settings=None) -> list[str]:
    settings = settings or get_settings()
    now = _now()
    removed: list[str] = []
    rows = (
        db.query(BackupRun)
        .filter(BackupRun.environment == settings.environment, BackupRun.status == BACKUP_SUCCESS)
        .all()
    )
    for row in rows:
        started = row.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        if should_retain(started, now, settings):
            continue
        location = Path(row.location) if row.location else None
        if location and location.exists():
            shutil.rmtree(location, ignore_errors=True)
        db.delete(row)
        removed.append(row.id)
    db.commit()
    return removed


def create_backup(db: Session, *, backup_type: str = BACKUP_TYPE_FULL) -> BackupRun:
    settings = get_settings()
    stamp = _now().strftime("%Y%m%d-%H%M%S")
    dest = _env_backup_root(settings) / stamp
    dest.mkdir(parents=True, exist_ok=True)
    run = BackupRun(
        backup_type=backup_type,
        environment=settings.environment,
        status=BACKUP_RUNNING,
        started_at=_now(),
        location=str(dest),
        provider="provider" if settings.backup_provider_managed else "local",
        extra=dumps({"backupType": backup_type}),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    record_event(
        event_type=BACKUP_STARTED,
        message=f"Backup started ({backup_type}) for {settings.environment}",
        severity=SEVERITY_INFO,
        category=CATEGORY_BACKUP,
        extra={"backupId": run.id, "location": run.location},
    )
    try:
        details: dict[str, Any] = {"environment": settings.environment, "backupType": backup_type}
        if settings.backup_provider_managed:
            details["note"] = "Provider-managed backups are enabled. This run records an application checkpoint only."
            dest.joinpath("MANIFEST.json").write_text(dumps(details), encoding="utf-8")
        else:
            if sqlite_file() is not None:
                details.update(_copy_sqlite(dest))
            else:
                details["database"] = "Use the database provider native backup for PostgreSQL."
            details.update(_copy_media(dest))
            dest.joinpath("MANIFEST.json").write_text(
                dumps({**details, "createdAt": _now().isoformat(), "backupId": run.id}),
                encoding="utf-8",
            )
        run.status = BACKUP_SUCCESS
        run.completed_at = _now()
        run.size_bytes = _dir_size(dest)
        run.extra = dumps(details)
        db.commit()
        db.refresh(run)
        apply_retention(db, settings)
        record_event(
            event_type=BACKUP_COMPLETED,
            message=f"Backup completed for {settings.environment}",
            severity=SEVERITY_INFO,
            category=CATEGORY_BACKUP,
            extra={"backupId": run.id, "sizeBytes": run.size_bytes},
        )
        return run
    except Exception as exc:
        run.status = BACKUP_FAILED
        run.completed_at = _now()
        run.error_message = sanitize_text(str(exc))
        db.commit()
        db.refresh(run)
        record_event(
            event_type=BACKUP_FAILED_EVENT,
            message="Database backup failed",
            severity=SEVERITY_CRITICAL,
            category=CATEGORY_BACKUP,
            extra={"backupId": run.id},
        )
        log.critical("Backup failed: %s", run.error_message)
        raise


def restore_backup(location: str, *, database_url: str | None = None, storage_dir: str | None = None) -> dict[str, Any]:
    settings = get_settings()
    source = Path(location)
    if not source.exists():
        raise FileNotFoundError("Backup location was not found")
    record_event(
        event_type=RESTORE_STARTED,
        message=f"Restore started for {settings.environment}",
        severity=SEVERITY_WARNING,
        category=CATEGORY_BACKUP,
        extra={"location": str(source)},
    )
    try:
        db_dest = sqlite_file(database_url or settings.database_url)
        db_src = source / "database.db"
        if db_dest is not None and db_src.exists():
            db_dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(db_src, db_dest)
        media_src = source / "media"
        media_dest = Path(storage_dir or settings.storage_dir)
        if media_src.exists():
            if media_dest.exists():
                shutil.rmtree(media_dest)
            shutil.copytree(media_src, media_dest)
        record_event(
            event_type=RESTORE_COMPLETED,
            message=f"Restore completed for {settings.environment}",
            severity=SEVERITY_INFO,
            category=CATEGORY_BACKUP,
            extra={"location": str(source)},
        )
        return {"ok": True, "location": str(source)}
    except Exception as exc:
        record_event(
            event_type=RESTORE_FAILED,
            message="Restore failed",
            severity=SEVERITY_CRITICAL,
            category=CATEGORY_BACKUP,
        )
        raise RuntimeError(sanitize_text(str(exc))) from exc


def serialize_backup(row: BackupRun) -> dict[str, Any]:
    return {
        "id": row.id,
        "backupType": row.backup_type,
        "environment": row.environment,
        "status": row.status,
        "startedAt": row.started_at.isoformat() if row.started_at else None,
        "completedAt": row.completed_at.isoformat() if row.completed_at else None,
        "location": row.location,
        "provider": row.provider,
        "sizeBytes": row.size_bytes,
        "errorMessage": row.error_message or None,
        "metadata": loads(row.extra),
    }


def backup_health(db: Session) -> dict[str, Any]:
    settings = get_settings()
    latest = (
        db.query(BackupRun)
        .filter(BackupRun.environment == settings.environment)
        .order_by(BackupRun.started_at.desc())
        .first()
    )
    latest_success = (
        db.query(BackupRun)
        .filter(BackupRun.environment == settings.environment, BackupRun.status == BACKUP_SUCCESS)
        .order_by(BackupRun.completed_at.desc())
        .first()
    )
    overdue_after = timedelta(hours=max(settings.backup_overdue_hours, 1))
    status = STATUS_UNKNOWN
    warning = None
    if latest and latest.status == BACKUP_FAILED:
        status = STATUS_UNHEALTHY
        warning = "CRITICAL"
    elif latest_success:
        completed = latest_success.completed_at or latest_success.started_at
        if completed.tzinfo is None:
            completed = completed.replace(tzinfo=timezone.utc)
        age = _now() - completed
        if age > overdue_after:
            status = STATUS_DEGRADED
            warning = "WARNING"
            record_event(
                event_type=BACKUP_OVERDUE,
                message="Backup overdue",
                severity=SEVERITY_WARNING,
                category=CATEGORY_BACKUP,
                debounce_key=f"backup-overdue:{settings.environment}",
            )
        else:
            status = STATUS_HEALTHY
    elif not settings.is_development:
        status = STATUS_UNHEALTHY
        warning = "CRITICAL"
    return {
        "status": status,
        "warning": warning,
        "lastAttempt": serialize_backup(latest) if latest else None,
        "lastSuccess": serialize_backup(latest_success) if latest_success else None,
        "overdueHours": settings.backup_overdue_hours,
        "retention": {
            "dailyDays": settings.backup_retention_daily_days,
            "weeklyWeeks": settings.backup_retention_weekly_weeks,
            "monthlyMonths": settings.backup_retention_monthly_months,
        },
        "mode": settings.backup_mode,
        "environment": settings.environment,
    }
