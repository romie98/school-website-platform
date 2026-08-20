"""Principal approval workflow: submit, approve, decline, resubmit, cancel."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import can_publish_directly
from app.models.ops import CATEGORY_APPROVAL, SEVERITY_ERROR
from app.models.approval import (
    ACTION_CREATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AUDIT_CHANGE_APPROVED,
    AUDIT_CHANGE_CANCELLED,
    AUDIT_CHANGE_DECLINED,
    AUDIT_CHANGE_RESUBMITTED,
    AUDIT_CHANGE_SUBMITTED,
    AUDIT_CONTENT_DELETED,
    AUDIT_CONTENT_PUBLISHED,
    AUDIT_PRINCIPAL_DIRECT_PUBLISH,
    RESOURCE_LABELS,
    STATUS_APPROVED,
    STATUS_CANCELLED,
    STATUS_DECLINED,
    STATUS_PENDING,
    AppNotification,
    ContentChange,
)
from app.models.user import PRINCIPAL, User
from app.services.audit_service import log_event
from app.services.content_apply import apply_create, apply_delete, apply_update, changed_fields, title_from
from app.util.jsonutil import dumps, loads

SINGLETON_RESOURCES = {
    "homepage",
    "principal_message",
    "contact",
    "branding",
    "homepage_sections",
    "navigation",
}


def now() -> datetime:
    return datetime.now(timezone.utc)


def serialize_change(row: ContentChange, *, include_payload: bool = False) -> dict[str, Any]:
    old_data = loads(row.old_data)
    new_data = loads(row.new_data)
    payload: dict[str, Any] = {
        "id": row.id,
        "resourceType": row.resource_type,
        "resourceLabel": RESOURCE_LABELS.get(row.resource_type, row.resource_type),
        "resourceId": row.resource_id,
        "action": row.action,
        "title": row.title,
        "status": row.status,
        "submittedBy": row.submitted_by,
        "submittedByName": row.submitted_by_name,
        "submittedAt": row.submitted_at.isoformat() if row.submitted_at else None,
        "reviewedBy": row.reviewed_by,
        "reviewedByName": row.reviewed_by_name,
        "reviewedAt": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "declineReason": row.decline_reason,
        "supersedesId": row.supersedes_id,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }
    if include_payload:
        payload["oldData"] = old_data
        payload["newData"] = new_data
        payload["changes"] = changed_fields(
            old_data if isinstance(old_data, dict) else {},
            new_data if isinstance(new_data, dict) else {},
        )
    return payload


def pending_conflict(db: Session, school_id: str, resource_type: str, resource_id: str | None) -> ContentChange | None:
    if not resource_id:
        return None
    return (
        db.query(ContentChange)
        .filter(
            ContentChange.school_id == school_id,
            ContentChange.resource_type == resource_type,
            ContentChange.resource_id == resource_id,
            ContentChange.status == STATUS_PENDING,
            ContentChange.action.in_((ACTION_UPDATE, ACTION_DELETE)),
        )
        .first()
    )


def _apply_for_school(db: Session, school_id: str, resource_type: str, action: str, resource_id: str | None, data: dict) -> dict | None:
    rid = None if resource_id in {None, "current"} else resource_id
    if action == ACTION_CREATE:
        return apply_create(db, school_id, resource_type, data)
    if action == ACTION_UPDATE:
        if not rid and resource_type not in SINGLETON_RESOURCES:
            raise HTTPException(status.HTTP_409_CONFLICT, "The original content is missing and cannot be updated")
        return apply_update(db, school_id, resource_type, rid or "current", data)
    if action == ACTION_DELETE:
        if not rid:
            raise HTTPException(status.HTTP_409_CONFLICT, "The original content is missing and cannot be deleted")
        apply_delete(db, school_id, resource_type, rid)
        return None
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown action")


def submit_change(
    db: Session,
    user: User,
    *,
    resource_type: str,
    action: str,
    new_data: dict | None,
    old_data: dict | None = None,
    resource_id: str | None = None,
    title: str = "",
    supersedes_id: str | None = None,
) -> ContentChange:
    school_id = user.school_id
    if not school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No school bound to this account")
    stored_id = resource_id or ("current" if resource_type in SINGLETON_RESOURCES else None)
    if action in {ACTION_UPDATE, ACTION_DELETE}:
        conflict = pending_conflict(db, school_id, resource_type, stored_id)
        if conflict:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={
                    "code": "pending_exists",
                    "message": "This content already has a change awaiting principal approval.",
                    "submittedByName": conflict.submitted_by_name,
                    "submittedAt": conflict.submitted_at.isoformat() if conflict.submitted_at else None,
                    "changeId": conflict.id,
                    "title": conflict.title,
                },
            )
    display_title = title or title_from(resource_type, new_data or old_data)
    change = ContentChange(
        school_id=school_id,
        resource_type=resource_type,
        resource_id=stored_id,
        action=action,
        title=display_title,
        submitted_by=user.id,
        submitted_by_name=user.name,
        submitted_at=now(),
        old_data=dumps(old_data or {}),
        new_data=dumps(new_data or {}),
        status=STATUS_PENDING,
        supersedes_id=supersedes_id,
    )
    db.add(change)
    db.flush()
    audit_action = AUDIT_CHANGE_RESUBMITTED if supersedes_id else AUDIT_CHANGE_SUBMITTED
    log_event(
        db,
        actor=user,
        action=audit_action,
        resource_type=resource_type,
        resource_id=stored_id,
        resource_name=display_title,
        change_request_id=change.id,
        old_data=old_data or {},
        new_data=new_data or {},
        status_before=(old_data or {}).get("status") if isinstance(old_data, dict) else None,
        status_after=STATUS_PENDING,
        metadata={"title": display_title, "action": action, "supersedesId": supersedes_id},
    )
    _notify_principals(
        db,
        school_id,
        title="New approval request",
        body=f"{user.name} submitted a {action} to “{display_title}”.",
        href=f"/admin/approvals/{change.id}",
        change_id=change.id,
    )
    db.commit()
    db.refresh(change)
    return change


def queue_or_publish(
    db: Session,
    user: User,
    *,
    resource_type: str,
    action: str,
    new_data: dict | None = None,
    old_data: dict | None = None,
    resource_id: str | None = None,
    title: str = "",
) -> dict:
    school_id = user.school_id
    if not school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No school bound to this account")
    if can_publish_directly(user):
        try:
            record = _apply_for_school(db, school_id, resource_type, action, resource_id, new_data or {})
            published_id = (record or {}).get("id") if isinstance(record, dict) else resource_id
            display_title = title or title_from(resource_type, new_data or old_data)
            if action == ACTION_DELETE:
                publish_action = AUDIT_CONTENT_DELETED
                status_after = "deleted"
            elif action == ACTION_CREATE:
                publish_action = AUDIT_PRINCIPAL_DIRECT_PUBLISH
                status_after = "published"
            else:
                publish_action = AUDIT_PRINCIPAL_DIRECT_PUBLISH
                status_after = (new_data or {}).get("status") if isinstance(new_data, dict) else "published"
            log_event(
                db,
                actor=user,
                action=publish_action,
                resource_type=resource_type,
                resource_id=str(published_id) if published_id else resource_id,
                resource_name=display_title,
                old_data=old_data or {},
                new_data=new_data or {},
                status_before=(old_data or {}).get("status") if isinstance(old_data, dict) else None,
                status_after=str(status_after or ""),
                metadata={"title": display_title, "action": action, "direct": True},
            )
            db.commit()
            return {"mode": "published", "record": record, "ok": True}
        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            from app.services.system_events import record_event

            record_event(
                event_type="APPROVAL_PUBLISH_FAILURE",
                message="Approval publish transaction failed",
                severity=SEVERITY_ERROR,
                category=CATEGORY_APPROVAL,
                tenant_id=school_id,
                extra={"resourceType": resource_type, "action": action, "exceptionType": type(exc).__name__},
            )
            raise HTTPException(status.HTTP_409_CONFLICT, "The change could not be published. Please try again.") from exc
    change = submit_change(
        db,
        user,
        resource_type=resource_type,
        action=action,
        new_data=new_data,
        old_data=old_data,
        resource_id=resource_id,
        title=title,
    )
    return {"mode": "pending", "change": serialize_change(change, include_payload=True), "ok": True}


def get_school_change(db: Session, school_id: str, change_id: str) -> ContentChange:
    row = db.get(ContentChange, change_id)
    if row is None or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return row


def approve_change(db: Session, user: User, change_id: str) -> ContentChange:
    if user.role != PRINCIPAL:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the principal can approve changes")
    school_id = user.school_id
    if not school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No school bound to this account")
    change = (
        db.query(ContentChange)
        .filter(ContentChange.id == change_id, ContentChange.school_id == school_id)
        .with_for_update()
        .one_or_none()
    )
    if change is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if change.status != STATUS_PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "This request has already been reviewed")
    try:
        record = _apply_for_school(db, school_id, change.resource_type, change.action, change.resource_id, loads(change.new_data))
        if change.action == ACTION_CREATE and isinstance(record, dict) and record.get("id"):
            change.resource_id = str(record["id"])
        change.status = STATUS_APPROVED
        change.reviewed_by = user.id
        change.reviewed_by_name = user.name
        change.reviewed_at = now()
        result_action = AUDIT_CONTENT_DELETED if change.action == ACTION_DELETE else AUDIT_CONTENT_PUBLISHED
        old_payload = loads(change.old_data)
        new_payload = loads(change.new_data)
        log_event(
            db,
            actor=user,
            action=AUDIT_CHANGE_APPROVED,
            resource_type=change.resource_type,
            resource_id=change.resource_id,
            resource_name=change.title,
            change_request_id=change.id,
            old_data=old_payload if isinstance(old_payload, dict) else {},
            new_data=new_payload if isinstance(new_payload, dict) else {},
            status_before=STATUS_PENDING,
            status_after="approved",
            reviewed_by=user,
            metadata={"title": change.title, "action": change.action, "submittedByName": change.submitted_by_name},
        )
        log_event(
            db,
            actor=user,
            action=result_action,
            resource_type=change.resource_type,
            resource_id=change.resource_id,
            resource_name=change.title,
            change_request_id=change.id,
            old_data=old_payload if isinstance(old_payload, dict) else {},
            new_data=new_payload if isinstance(new_payload, dict) else {},
            status_before=STATUS_PENDING,
            status_after="deleted" if change.action == ACTION_DELETE else "published",
            reviewed_by=user,
            metadata={"title": change.title, "action": change.action, "submittedByName": change.submitted_by_name},
        )
        _notify_user(
            db,
            school_id,
            change.submitted_by,
            title="Your change was approved",
            body=f"“{change.title}” was approved by {user.name}.",
            href=f"/admin/changes/{change.id}",
            change_id=change.id,
        )
        db.commit()
        db.refresh(change)
        return change
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        from app.services.system_events import record_event

        record_event(
            event_type="APPROVAL_PUBLISH_FAILURE",
            message="Approval publish transaction failed",
            severity=SEVERITY_ERROR,
            category=CATEGORY_APPROVAL,
            tenant_id=school_id,
            extra={"changeRequestId": change_id, "exceptionType": type(exc).__name__},
        )
        raise HTTPException(status.HTTP_409_CONFLICT, "The change could not be published. Please try again.") from exc


def decline_change(db: Session, user: User, change_id: str, reason: str) -> ContentChange:
    if user.role != PRINCIPAL:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the principal can decline changes")
    reason = (reason or "").strip()
    if not reason:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A reason is required when declining a change")
    change = get_school_change(db, user.school_id or "", change_id)
    if change.status != STATUS_PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "This request has already been reviewed")
    change.status = STATUS_DECLINED
    change.reviewed_by = user.id
    change.reviewed_by_name = user.name
    change.reviewed_at = now()
    change.decline_reason = reason
    old_payload = loads(change.old_data)
    new_payload = loads(change.new_data)
    log_event(
        db,
        actor=user,
        action=AUDIT_CHANGE_DECLINED,
        resource_type=change.resource_type,
        resource_id=change.resource_id,
        resource_name=change.title,
        change_request_id=change.id,
        old_data=old_payload if isinstance(old_payload, dict) else {},
        new_data=new_payload if isinstance(new_payload, dict) else {},
        status_before=STATUS_PENDING,
        status_after=STATUS_DECLINED,
        reviewed_by=user,
        decline_reason=reason,
        metadata={"title": change.title, "action": change.action, "reason": reason, "submittedByName": change.submitted_by_name},
    )
    _notify_user(
        db,
        change.school_id,
        change.submitted_by,
        title="Your change was declined",
        body=f"“{change.title}” was declined by {user.name}. Reason: {reason}",
        href=f"/admin/changes/{change.id}",
        change_id=change.id,
    )
    db.commit()
    db.refresh(change)
    return change


def cancel_change(db: Session, user: User, change_id: str) -> ContentChange:
    change = get_school_change(db, user.school_id or "", change_id)
    if change.status != STATUS_PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only pending requests can be cancelled")
    if change.submitted_by != user.id and user.role != PRINCIPAL:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only cancel your own requests")
    change.status = STATUS_CANCELLED
    change.reviewed_by = user.id
    change.reviewed_by_name = user.name
    change.reviewed_at = now()
    old_payload = loads(change.old_data)
    new_payload = loads(change.new_data)
    log_event(
        db,
        actor=user,
        action=AUDIT_CHANGE_CANCELLED,
        resource_type=change.resource_type,
        resource_id=change.resource_id,
        resource_name=change.title,
        change_request_id=change.id,
        old_data=old_payload if isinstance(old_payload, dict) else {},
        new_data=new_payload if isinstance(new_payload, dict) else {},
        status_before=STATUS_PENDING,
        status_after=STATUS_CANCELLED,
        metadata={"title": change.title, "action": change.action},
    )
    db.commit()
    db.refresh(change)
    return change


def resubmit_change(db: Session, user: User, change_id: str, new_data: dict | None = None) -> ContentChange:
    original = get_school_change(db, user.school_id or "", change_id)
    if original.status != STATUS_DECLINED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only declined requests can be resubmitted")
    if original.submitted_by and original.submitted_by != user.id and user.role != PRINCIPAL:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only resubmit your own requests")
    raw_new = new_data if new_data is not None else loads(original.new_data)
    raw_old = loads(original.old_data)
    payload = raw_new if isinstance(raw_new, dict) else {}
    return submit_change(
        db,
        user,
        resource_type=original.resource_type,
        action=original.action,
        new_data=payload,
        old_data=raw_old if isinstance(raw_old, dict) else {},
        resource_id=None if original.action == ACTION_CREATE else original.resource_id,
        title=title_from(original.resource_type, payload) or original.title,
        supersedes_id=original.id,
    )


def list_changes(db: Session, school_id: str, *, status_filter: str | None = None, submitted_by: str | None = None) -> list[ContentChange]:
    query = db.query(ContentChange).filter(ContentChange.school_id == school_id)
    if status_filter:
        query = query.filter(ContentChange.status == status_filter)
    if submitted_by:
        query = query.filter(ContentChange.submitted_by == submitted_by)
    return query.order_by(ContentChange.submitted_at.desc()).all()


def change_stats(db: Session, school_id: str, *, submitted_by: str | None = None) -> dict:
    rows = list_changes(db, school_id, submitted_by=submitted_by)
    month = now().strftime("%Y-%m")
    return {
        "pending": sum(1 for row in rows if row.status == STATUS_PENDING),
        "approved": sum(1 for row in rows if row.status == STATUS_APPROVED),
        "declined": sum(1 for row in rows if row.status == STATUS_DECLINED),
        "approvedThisMonth": sum(
            1 for row in rows
            if row.status == STATUS_APPROVED and row.reviewed_at and row.reviewed_at.strftime("%Y-%m") == month
        ),
        "declinedThisMonth": sum(
            1 for row in rows
            if row.status == STATUS_DECLINED and row.reviewed_at and row.reviewed_at.strftime("%Y-%m") == month
        ),
    }


def serialize_notification(row: AppNotification) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "body": row.body,
        "href": row.href,
        "kind": row.kind,
        "changeRequestId": row.change_request_id,
        "readAt": row.read_at.isoformat() if row.read_at else None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _notify_principals(db: Session, school_id: str, *, title: str, body: str, href: str, change_id: str) -> None:
    principals = db.query(User).filter(User.school_id == school_id, User.role == PRINCIPAL, User.is_active.is_(True)).all()
    for person in principals:
        _notify_user(db, school_id, person.id, title=title, body=body, href=href, change_id=change_id)


def _notify_user(db: Session, school_id: str, user_id: str | None, *, title: str, body: str, href: str, change_id: str | None) -> None:
    if not user_id:
        return
    db.add(
        AppNotification(
            school_id=school_id,
            user_id=user_id,
            title=title,
            body=body,
            href=href,
            kind="approval",
            change_request_id=change_id,
        )
    )
