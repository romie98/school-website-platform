"""Append-only audit logging. Callers must commit the surrounding transaction."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.approval import (
    ACTION_FILTER_GROUPS,
    AUDIT_CHANGE_APPROVED,
    AUDIT_CHANGE_DECLINED,
    AUDIT_CHANGE_RESUBMITTED,
    AUDIT_CHANGE_SUBMITTED,
    AUDIT_CONTENT_DELETED,
    AUDIT_CONTENT_PUBLISHED,
    AUDIT_PRINCIPAL_DIRECT_PUBLISH,
    RESOURCE_LABELS,
    SECURITY_ACTIONS,
    AuditEvent,
)
from app.models.school import School
from app.models.user import EDITOR, PRINCIPAL, SCHOOL_ADMIN, SUPER_ADMIN, User
from app.services.content_apply import SKIP_DIFF_KEYS, changed_fields
from app.util.jsonutil import dumps, loads

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "passwordhash",
    "token",
    "access_token",
    "accesstoken",
    "refresh_token",
    "refreshtoken",
    "secret",
    "secret_key",
    "apikey",
    "api_key",
    "session",
    "session_token",
}

ROLE_LABELS = {
    SUPER_ADMIN: "Super Admin",
    SCHOOL_ADMIN: "Administrator",
    PRINCIPAL: "Principal",
    EDITOR: "Content Editor",
}

MAX_STRING = 4000
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


def role_label(role: str | None) -> str:
    if not role:
        return ""
    return ROLE_LABELS.get(role, role.replace("_", " ").title())


def sanitize(value: Any, depth: int = 0) -> Any:
    if depth > 6:
        return None
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower().replace("-", "_")
            if lowered in SENSITIVE_KEYS:
                continue
            cleaned[key] = sanitize(item, depth + 1)
        return cleaned
    if isinstance(value, list):
        return [sanitize(item, depth + 1) for item in value[:50]]
    if isinstance(value, str) and len(value) > MAX_STRING:
        return value[:MAX_STRING] + "…"
    return value


def public_payload(value: dict | None) -> dict[str, Any]:
    data = sanitize(value or {})
    if not isinstance(data, dict):
        return {}
    return {key: item for key, item in data.items() if key not in SKIP_DIFF_KEYS}


def _school_name(db: Session, school_id: str | None) -> str:
    if not school_id:
        return ""
    school = db.get(School, school_id)
    return school.name if school else ""


def log_event(
    db: Session,
    *,
    action: str,
    actor: User | None = None,
    school_id: str | None = None,
    actor_name: str | None = None,
    actor_role: str | None = None,
    resource_type: str = "",
    resource_id: str | None = None,
    resource_name: str = "",
    change_request_id: str | None = None,
    old_data: dict | None = None,
    new_data: dict | None = None,
    status_before: str | None = None,
    status_after: str | None = None,
    reviewed_by: User | None = None,
    decline_reason: str = "",
    metadata: dict | None = None,
) -> AuditEvent:
    tenant_id = school_id or (actor.school_id if actor else None)
    try:
        event = AuditEvent(
            school_id=tenant_id,
            school_name=_school_name(db, tenant_id),
            user_id=actor.id if actor else None,
            user_name=(actor.name if actor else actor_name) or "",
            user_role=(actor.role if actor else actor_role) or "",
            action=action,
            resource_type=resource_type or "",
            resource_id=resource_id,
            resource_name=(resource_name or "")[:255],
            change_request_id=change_request_id,
            old_data=dumps(public_payload(old_data)),
            new_data=dumps(public_payload(new_data)),
            status_before=status_before or "",
            status_after=status_after or "",
            reviewed_by_user_id=reviewed_by.id if reviewed_by else None,
            reviewed_by_name=reviewed_by.name if reviewed_by else "",
            decline_reason=decline_reason or "",
            data=dumps(sanitize(metadata or {})),
        )
        db.add(event)
        db.flush()
        return event
    except Exception:
        from app.models.ops import CATEGORY_AUDIT, SEVERITY_ERROR
        from app.services.system_events import record_event

        record_event(
            event_type="AUDIT_WRITE_FAILURE",
            message="Failed to write a required audit event",
            severity=SEVERITY_ERROR,
            category=CATEGORY_AUDIT,
            tenant_id=tenant_id,
            extra={"action": action, "resourceType": resource_type},
        )
        raise


def serialize_event(row: AuditEvent, *, include_payload: bool = True) -> dict[str, Any]:
    old_data = loads(row.old_data)
    new_data = loads(row.new_data)
    metadata = loads(row.data)
    payload: dict[str, Any] = {
        "id": row.id,
        "schoolId": row.school_id,
        "schoolName": row.school_name,
        "actorUserId": row.user_id,
        "actorName": row.user_name,
        "actorRole": row.user_role,
        "actorRoleLabel": role_label(row.user_role),
        "action": row.action,
        "resourceType": row.resource_type,
        "resourceLabel": RESOURCE_LABELS.get(row.resource_type, row.resource_type.replace("_", " ").title()),
        "resourceId": row.resource_id,
        "resourceName": row.resource_name,
        "changeRequestId": row.change_request_id,
        "statusBefore": row.status_before or None,
        "statusAfter": row.status_after or None,
        "reviewedByUserId": row.reviewed_by_user_id,
        "reviewedByName": row.reviewed_by_name or None,
        "declineReason": row.decline_reason or None,
        "contentAction": metadata.get("action") or metadata.get("contentAction"),
        "supersedesId": metadata.get("supersedesId"),
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "isSecurity": row.action in SECURITY_ACTIONS,
    }
    if include_payload:
        payload["oldData"] = old_data if isinstance(old_data, dict) else {}
        payload["newData"] = new_data if isinstance(new_data, dict) else {}
        payload["changes"] = changed_fields(
            old_data if isinstance(old_data, dict) else {},
            new_data if isinstance(new_data, dict) else {},
        )
        payload["metadata"] = metadata
    return payload


def _parse_date(value: str | None, *, end: bool = False) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        if len(raw) <= 10:
            parsed = datetime.fromisoformat(raw)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            if end:
                return parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
            return parsed
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def query_events(
    db: Session,
    *,
    school_id: str | None,
    action: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    actor_id: str | None = None,
    change_request_id: str | None = None,
    status: str | None = None,
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    category: str | None = None,
    hide_failed_logins: bool = False,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> dict[str, Any]:
    query = db.query(AuditEvent)
    if school_id:
        query = query.filter(AuditEvent.school_id == school_id)
    if action:
        grouped = ACTION_FILTER_GROUPS.get(action.lower())
        if grouped:
            query = query.filter(AuditEvent.action.in_(grouped))
        else:
            query = query.filter(AuditEvent.action == action)
    if resource_type:
        query = query.filter(AuditEvent.resource_type == resource_type)
    if resource_id:
        query = query.filter(AuditEvent.resource_id == resource_id)
    if actor_id:
        query = query.filter(AuditEvent.user_id == actor_id)
    if change_request_id:
        query = query.filter(AuditEvent.change_request_id == change_request_id)
    if status:
        query = query.filter(or_(AuditEvent.status_after == status, AuditEvent.status_before == status))
    if category == "security":
        query = query.filter(AuditEvent.action.in_(SECURITY_ACTIONS))
    elif category == "content":
        query = query.filter(~AuditEvent.action.in_(SECURITY_ACTIONS))
    if hide_failed_logins:
        query = query.filter(AuditEvent.action != "LOGIN_FAILED")
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AuditEvent.user_name.ilike(term),
                AuditEvent.resource_name.ilike(term),
                AuditEvent.action.ilike(term),
                AuditEvent.reviewed_by_name.ilike(term),
            )
        )
    start = _parse_date(date_from)
    finish = _parse_date(date_to, end=True)
    if start:
        query = query.filter(AuditEvent.created_at >= start)
    if finish:
        query = query.filter(AuditEvent.created_at <= finish)

    total = query.count()
    size = min(max(page_size, 1), MAX_PAGE_SIZE)
    current = max(page, 1)
    rows = (
        query.order_by(AuditEvent.created_at.desc())
        .offset((current - 1) * size)
        .limit(size)
        .all()
    )
    pages = max(1, (total + size - 1) // size) if total else 1
    return {
        "items": [serialize_event(row) for row in rows],
        "total": total,
        "page": current,
        "pageSize": size,
        "totalPages": pages,
    }


def get_event(db: Session, event_id: str, *, school_id: str | None = None) -> AuditEvent | None:
    row = db.get(AuditEvent, event_id)
    if row is None:
        return None
    if school_id and row.school_id != school_id:
        return None
    return row


def related_events(db: Session, row: AuditEvent, *, school_id: str | None = None) -> list[AuditEvent]:
    query = db.query(AuditEvent)
    if school_id:
        query = query.filter(AuditEvent.school_id == school_id)
    if row.change_request_id:
        query = query.filter(AuditEvent.change_request_id == row.change_request_id)
    elif row.resource_type and row.resource_id:
        query = query.filter(AuditEvent.resource_type == row.resource_type, AuditEvent.resource_id == row.resource_id)
    else:
        return [row]
    return query.order_by(AuditEvent.created_at.asc()).all()


def summary(db: Session, school_id: str) -> dict[str, int]:
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    rows = (
        db.query(AuditEvent)
        .filter(AuditEvent.school_id == school_id)
        .filter(AuditEvent.created_at >= datetime.fromisoformat(f"{month}-01").replace(tzinfo=timezone.utc))
        .all()
    )
    def count(*actions: str) -> int:
        return sum(1 for row in rows if row.action in actions)

    return {
        "submitted": count(AUDIT_CHANGE_SUBMITTED, AUDIT_CHANGE_RESUBMITTED),
        "approved": count(AUDIT_CHANGE_APPROVED),
        "declined": count(AUDIT_CHANGE_DECLINED),
        "published": count(AUDIT_CONTENT_PUBLISHED, AUDIT_PRINCIPAL_DIRECT_PUBLISH),
        "deleted": count(AUDIT_CONTENT_DELETED),
        "total": len(rows),
    }


def user_summary(db: Session, school_id: str, user_id: str) -> dict[str, Any]:
    rows = (
        db.query(AuditEvent)
        .filter(AuditEvent.school_id == school_id, AuditEvent.user_id == user_id)
        .order_by(AuditEvent.created_at.desc())
        .all()
    )
    name = rows[0].user_name if rows else ""
    role = rows[0].user_role if rows else ""
    return {
        "userId": user_id,
        "name": name,
        "role": role,
        "roleLabel": role_label(role),
        "submitted": sum(1 for row in rows if row.action in {AUDIT_CHANGE_SUBMITTED, AUDIT_CHANGE_RESUBMITTED}),
        "approved": sum(1 for row in rows if row.action == AUDIT_CHANGE_APPROVED),
        "declined": sum(1 for row in rows if row.action == AUDIT_CHANGE_DECLINED),
        "total": len(rows),
    }
