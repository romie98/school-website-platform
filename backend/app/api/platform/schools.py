from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_super_admin
from app.models.school import School, SubscriptionPlan
from app.models.user import User
from app.services.feature_service import DEFAULT_FEATURES
from app.services.platform_service import (
    add_domain,
    create_school,
    create_school_admin,
    delete_domain,
    ensure_default_plans,
    list_all_domains,
    platform_stats,
    serialize_plan,
    serialize_school,
    serialize_user,
    update_domain,
    update_platform_user,
    update_school,
)
from app.services.theme_service import list_theme_presets

router = APIRouter(prefix="/api/platform", tags=["platform"])


def _school(db: Session, school_id: str) -> School:
    school = db.get(School, school_id)
    if school is None:
        raise HTTPException(status_code=404, detail="Not found")
    return school


@router.get("/stats")
def stats(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return platform_stats(db)


@router.get("/plans")
def list_plans(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    ensure_default_plans(db)
    db.commit()
    return [serialize_plan(plan) for plan in db.query(SubscriptionPlan).order_by(SubscriptionPlan.name).all()]


@router.get("/themes")
def list_themes(_user: User = Depends(require_super_admin)):
    return list_theme_presets()


@router.get("/features")
def list_features(_user: User = Depends(require_super_admin)):
    return [{"id": key, "enabled": value} for key, value in DEFAULT_FEATURES.items()]


@router.get("/schools")
def list_schools(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return [serialize_school(db, school) for school in db.query(School).order_by(School.name).all()]


@router.post("/schools")
def create_school_route(body: dict[str, Any], _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    school = create_school(db, body)
    return serialize_school(db, school, detail=True)


@router.get("/schools/{school_id}")
def get_school(school_id: str, _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return serialize_school(db, _school(db, school_id), detail=True)


@router.patch("/schools/{school_id}")
def patch_school(school_id: str, body: dict[str, Any], _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    school = update_school(db, _school(db, school_id), body)
    return serialize_school(db, school, detail=True)


@router.get("/schools/{school_id}/domains")
def school_domains(school_id: str, _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    school = _school(db, school_id)
    return serialize_school(db, school, detail=True)["domains"]


@router.post("/schools/{school_id}/domains")
def add_school_domain(school_id: str, body: dict[str, Any], _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = add_domain(db, _school(db, school_id), body)
    return {"id": row.id, "domain": row.domain, "isPrimary": row.is_primary, "verified": row.verified}


@router.patch("/schools/{school_id}/domains/{domain_id}")
def patch_school_domain(school_id: str, domain_id: str, body: dict[str, Any], _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = update_domain(db, _school(db, school_id), domain_id, body)
    return {"id": row.id, "domain": row.domain, "isPrimary": row.is_primary, "verified": row.verified}


@router.delete("/schools/{school_id}/domains/{domain_id}")
def remove_school_domain(school_id: str, domain_id: str, _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    delete_domain(db, _school(db, school_id), domain_id)
    return {"ok": True}


@router.post("/schools/{school_id}/admins")
def add_school_admin(school_id: str, body: dict[str, Any], _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = create_school_admin(db, _school(db, school_id), body)
    return serialize_user(user)


@router.get("/domains")
def domains(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return list_all_domains(db)


@router.get("/users")
def platform_users(_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    schools = {school.id: school.name for school in db.query(School).all()}
    return [serialize_user(user, schools.get(user.school_id) if user.school_id else "Platform") for user in db.query(User).order_by(User.name).all()]


@router.patch("/users/{user_id}")
def patch_user(user_id: str, body: dict[str, Any], actor: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return serialize_user(update_platform_user(db, user_id, body, actor))


@router.get("/audit")
def platform_audit(
    tenant_id: str | None = Query(None, alias="tenantId"),
    action: str | None = None,
    resource_type: str | None = Query(None, alias="resourceType"),
    resource_id: str | None = Query(None, alias="resourceId"),
    user_id: str | None = Query(None, alias="userId"),
    status: str | None = None,
    q: str | None = None,
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
    category: str | None = None,
    page: int = 1,
    page_size: int = Query(50, alias="pageSize"),
    _user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    from app.services.audit_service import query_events
    return query_events(
        db,
        school_id=tenant_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=user_id,
        status=status,
        q=q,
        date_from=date_from,
        date_to=date_to,
        category=category,
        page=page,
        page_size=page_size,
    )


@router.get("/audit/{event_id}")
def platform_audit_detail(event_id: str, _user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    from app.services.audit_service import get_event, related_events, serialize_event
    row = get_event(db, event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return {**serialize_event(row), "timeline": [serialize_event(item) for item in related_events(db, row)]}
