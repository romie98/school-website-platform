from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.request_context import snapshot
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_super_admin
from app.models.ops import (
    CATEGORY_FRONTEND,
    CATEGORY_UPLOAD,
    SEVERITY_WARNING,
    SystemEvent,
)
from app.models.school import School
from app.models.user import User
from app.services.backup_service import backup_health, serialize_backup
from app.services.health_service import check_database, check_storage, overall_status
from app.services.system_events import list_events, record_event, resolve_event, serialize_event

router = APIRouter(prefix="/api/platform", tags=["platform"])


def _today_start():
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("/system")
def system_status(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    settings = get_settings()
    database = check_database()["status"]
    storage = check_storage()["status"]
    backups = backup_health(db)
    api_status = "DEGRADED" if database != "HEALTHY" else "HEALTHY"
    overall = overall_status(database, storage)
    if backups["status"] == "UNHEALTHY" and overall == "HEALTHY":
        overall = "DEGRADED"
    start = _today_start()
    today = db.query(SystemEvent).filter(SystemEvent.created_at >= start).all()
    return {
        "ok": overall in {"HEALTHY", "DEGRADED"},
        "environment": settings.environment,
        "platformDomain": settings.platform_domain,
        "storageProvider": settings.storage_provider,
        "schools": db.query(School).count(),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "services": {
            "frontend": "HEALTHY",
            "api": api_status,
            "database": database,
            "storage": storage,
            "backup": backups["status"],
        },
        "status": overall,
        "backup": backups,
        "counts": {
            "errorsToday": sum(1 for row in today if row.severity in {"ERROR", "CRITICAL"}),
            "failedUploadsToday": sum(1 for row in today if row.category == CATEGORY_UPLOAD),
            "criticalToday": sum(1 for row in today if row.severity == "CRITICAL"),
            "unresolved": db.query(SystemEvent).filter(SystemEvent.resolved_at.is_(None), SystemEvent.severity.in_(["ERROR", "CRITICAL"])).count(),
        },
    }


@router.get("/system/events")
def system_events(
    _user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    category: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    unresolved: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
):
    rows = list_events(db, category=category, severity=severity, unresolved_only=unresolved, limit=limit)
    return {"items": [serialize_event(row) for row in rows]}


@router.get("/system/events/{event_id}")
def system_event_detail(event_id: str, _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = db.get(SystemEvent, event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_event(row)


@router.post("/system/events/{event_id}/resolve")
def resolve_system_event(event_id: str, _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = resolve_event(db, event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_event(row)


@router.get("/system/backups")
def list_backups(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    from app.models.ops import BackupRun

    settings = get_settings()
    rows = (
        db.query(BackupRun)
        .filter(BackupRun.environment == settings.environment)
        .order_by(BackupRun.started_at.desc())
        .limit(30)
        .all()
    )
    return {"items": [serialize_backup(row) for row in rows], "health": backup_health(db)}


class ClientErrorIn(BaseModel):
    message: str
    route: str | None = None
    extra: dict | None = None


ops_router = APIRouter(prefix="/api/ops", tags=["ops"])


@ops_router.post("/client-error")
def client_error(body: ClientErrorIn, user: User = Depends(get_current_user)):
    ctx = snapshot()
    record_event(
        event_type="FRONTEND_ERROR",
        message=body.message[:500] or "Frontend error",
        severity=SEVERITY_WARNING,
        category=CATEGORY_FRONTEND,
        tenant_id=user.school_id,
        user_id=user.id,
        user_role=user.role,
        route=body.route or ctx["route"],
        extra={"source": "frontend", **(body.extra or {})},
    )
    return {"ok": True}
