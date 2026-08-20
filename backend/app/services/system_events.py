"""Persist significant operational events. Never used for routine health probes."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.request_context import snapshot
from app.core.sanitize import sanitize_text, sanitize_value
from app.models.ops import (
    CATEGORY_UNKNOWN,
    SEVERITY_CRITICAL,
    SEVERITY_ERROR,
    SystemEvent,
)
from app.models.school import School
from app.services.alerting import notify_ops
from app.util.jsonutil import dumps, loads

log = logging.getLogger(__name__)

_last_emit: dict[str, float] = {}
_DEBOUNCE_SECONDS = 30.0


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _school_name(db: Session, tenant_id: str | None) -> str:
    if not tenant_id:
        return ""
    school = db.get(School, tenant_id)
    return school.name if school else ""


def record_event(
    db: Session | None = None,
    *,
    event_type: str,
    message: str,
    severity: str = SEVERITY_ERROR,
    category: str = CATEGORY_UNKNOWN,
    tenant_id: str | None = None,
    tenant_name: str | None = None,
    service: str = "api",
    extra: dict[str, Any] | None = None,
    request_id: str | None = None,
    route: str | None = None,
    user_id: str | None = None,
    user_role: str | None = None,
    debounce_key: str | None = None,
) -> SystemEvent | None:
    """Write a system event using a short-lived session so it survives request rollbacks."""
    if debounce_key:
        import time

        previous = _last_emit.get(debounce_key, 0.0)
        now = time.monotonic()
        if now - previous < _DEBOUNCE_SECONDS:
            return None
        _last_emit[debounce_key] = now

    ctx = snapshot()
    from app.db.session import SessionLocal

    session = db if db is not None else SessionLocal()
    owns = db is None
    try:
        tid = tenant_id or ctx["tenant_id"] or None
        event = SystemEvent(
            event_type=event_type,
            severity=severity,
            category=category,
            tenant_id=tid,
            tenant_name=tenant_name or ctx["tenant_name"] or _school_name(session, tid),
            service=service,
            message=sanitize_text(message),
            extra=dumps(sanitize_value(extra or {})),
            request_id=request_id or ctx["request_id"] or "",
            route=route or ctx["route"] or "",
            user_id=user_id or ctx["user_id"] or None,
            user_role=user_role or ctx["user_role"] or "",
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        if severity in {SEVERITY_ERROR, SEVERITY_CRITICAL}:
            notify_ops(severity=severity, title=event_type, message=message, extra={"category": category, "tenant": event.tenant_name})
        return event
    except Exception:
        if owns:
            session.rollback()
        log.warning("Failed to persist system event %s", event_type, exc_info=True)
        return None
    finally:
        if owns:
            session.close()


def serialize_event(row: SystemEvent) -> dict[str, Any]:
    return {
        "id": row.id,
        "eventType": row.event_type,
        "severity": row.severity,
        "category": row.category,
        "tenantId": row.tenant_id,
        "tenantName": row.tenant_name or "Platform",
        "service": row.service,
        "message": row.message,
        "metadata": loads(row.extra),
        "requestId": row.request_id or None,
        "route": row.route or None,
        "userId": row.user_id,
        "userRole": row.user_role or None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "resolvedAt": row.resolved_at.isoformat() if row.resolved_at else None,
    }


def list_events(
    db: Session,
    *,
    category: str | None = None,
    severity: str | None = None,
    unresolved_only: bool = False,
    limit: int = 50,
) -> list[SystemEvent]:
    query = db.query(SystemEvent)
    if category:
        query = query.filter(SystemEvent.category == category.upper())
    if severity:
        query = query.filter(SystemEvent.severity == severity.upper())
    if unresolved_only:
        query = query.filter(SystemEvent.resolved_at.is_(None))
    return query.order_by(SystemEvent.created_at.desc()).limit(min(max(limit, 1), 200)).all()


def resolve_event(db: Session, event_id: str) -> SystemEvent | None:
    row = db.get(SystemEvent, event_id)
    if row is None:
        return None
    row.resolved_at = _now()
    db.commit()
    db.refresh(row)
    return row
