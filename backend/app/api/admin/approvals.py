from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_school_user, school_id_for
from app.models.user import PRINCIPAL, User
from app.services.approval_service import (
    approve_change,
    cancel_change,
    change_stats,
    decline_change,
    get_school_change,
    list_changes,
    resubmit_change,
    serialize_change,
    serialize_notification,
)
from app.models.approval import AppNotification

router = APIRouter(prefix="/api/admin", tags=["approvals"])


def _sid(user: User) -> str:
    return school_id_for(user)


@router.get("/changes/stats")
def approval_stats(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    mine = user.role != PRINCIPAL
    return change_stats(db, _sid(user), submitted_by=user.id if mine else None)


@router.get("/changes")
def list_approval_changes(
    status: str | None = Query(None),
    mine: bool = Query(False),
    user: User = Depends(require_school_user),
    db: Session = Depends(get_db),
):
    submitted_by = None if user.role == PRINCIPAL and not mine else user.id
    rows = list_changes(db, _sid(user), status_filter=status, submitted_by=submitted_by)
    return [serialize_change(row) for row in rows]


@router.get("/changes/{change_id}")
def get_approval_change(change_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_school_change(db, _sid(user), change_id)
    if user.role != PRINCIPAL and row.submitted_by != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_change(row, include_payload=True)


@router.post("/changes/{change_id}/approve")
def approve_approval_change(change_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = approve_change(db, user, change_id)
    return serialize_change(row, include_payload=True)


@router.post("/changes/{change_id}/decline")
def decline_approval_change(change_id: str, body: dict, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = decline_change(db, user, change_id, (body or {}).get("reason") or "")
    return serialize_change(row, include_payload=True)


@router.post("/changes/{change_id}/cancel")
def cancel_approval_change(change_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = cancel_change(db, user, change_id)
    return serialize_change(row)


@router.post("/changes/{change_id}/resubmit")
def resubmit_approval_change(change_id: str, body: dict | None = None, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = resubmit_change(db, user, change_id, (body or {}).get("newData"))
    return serialize_change(row, include_payload=True)


@router.get("/notifications")
def list_notifications(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    rows = (
        db.query(AppNotification)
        .filter(AppNotification.user_id == user.id, AppNotification.school_id == _sid(user))
        .order_by(AppNotification.created_at.desc())
        .limit(50)
        .all()
    )
    unread = sum(1 for row in rows if row.read_at is None)
    return {"unread": unread, "items": [serialize_notification(row) for row in rows]}


@router.post("/notifications/{item_id}/read")
def read_notification(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = db.get(AppNotification, item_id)
    if row is None or row.user_id != user.id or row.school_id != _sid(user):
        raise HTTPException(status_code=404, detail="Not found")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.commit()
    return serialize_notification(row)
