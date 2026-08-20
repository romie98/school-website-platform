from fastapi import Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.db.session import get_db
from app.models.school import School
from app.services.tenant_service import TenantResolutionError, assert_school_public, resolve_tenant


def current_school(
    request: Request,
    db: Session = Depends(get_db),
    x_tenant_slug: str | None = Header(default=None, alias="X-Tenant-Slug"),
    tenant: str | None = Query(default=None),
) -> School:
    settings = get_settings()
    slug = None
    if settings.is_development:
        slug = x_tenant_slug or tenant
    host = request.headers.get("host") or request.headers.get("x-forwarded-host")
    try:
        school = resolve_tenant(
            db,
            hostname=host,
            slug=slug,
            allow_dev_override=settings.is_development,
        )
        assert_school_public(school)
        loaded = db.scalar(select(School).options(joinedload(School.settings)).where(School.id == school.id))
        return loaded or school
    except TenantResolutionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
