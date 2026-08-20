from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_school_admin, school_id_for
from app.models.user import PRINCIPAL, SCHOOL_ADMIN, User
from app.services.audit_service import (
    get_event,
    query_events,
    related_events,
    serialize_event,
    summary,
    user_summary,
)

router = APIRouter(prefix="/api/admin", tags=["audit"])


def _sid(user: User) -> str:
    return school_id_for(user)


def _hide_failed_logins(user: User) -> bool:
    return user.role == SCHOOL_ADMIN


@router.get("/audit")
def list_audit(
    action: str | None = Query(None),
    resource_type: str | None = Query(None, alias="resourceType"),
    resource_id: str | None = Query(None, alias="resourceId"),
    user_id: str | None = Query(None, alias="userId"),
    status: str | None = Query(None),
    q: str | None = Query(None),
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100, alias="pageSize"),
    user: User = Depends(require_school_admin),
    db: Session = Depends(get_db),
):
    result = query_events(
        db,
        school_id=_sid(user),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=user_id,
        status=status,
        q=q,
        date_from=date_from,
        date_to=date_to,
        category=category,
        hide_failed_logins=_hide_failed_logins(user),
        page=page,
        page_size=page_size,
    )
    result["summary"] = summary(db, _sid(user))
    return result


@router.get("/audit/summary")
def audit_summary(user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    return summary(db, _sid(user))


@router.get("/audit/resource/{resource_type}/{resource_id}")
def resource_audit(
    resource_type: str,
    resource_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100, alias="pageSize"),
    user: User = Depends(require_school_admin),
    db: Session = Depends(get_db),
):
    return query_events(
        db,
        school_id=_sid(user),
        resource_type=resource_type,
        resource_id=resource_id,
        hide_failed_logins=_hide_failed_logins(user),
        page=page,
        page_size=page_size,
    )


@router.get("/audit/user/{user_id}")
def user_audit(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100, alias="pageSize"),
    user: User = Depends(require_school_admin),
    db: Session = Depends(get_db),
):
    if user.role != PRINCIPAL and user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own activity")
    payload = query_events(
        db,
        school_id=_sid(user),
        actor_id=user_id,
        hide_failed_logins=_hide_failed_logins(user),
        page=page,
        page_size=page_size,
    )
    payload["profile"] = user_summary(db, _sid(user), user_id)
    return payload


@router.get("/audit/{event_id}")
def get_audit(event_id: str, user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    row = get_event(db, event_id, school_id=_sid(user))
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    if _hide_failed_logins(user) and row.action == "LOGIN_FAILED":
        raise HTTPException(status_code=404, detail="Not found")
    related = related_events(db, row, school_id=_sid(user))
    return {
        **serialize_event(row),
        "timeline": [serialize_event(item) for item in related],
    }
