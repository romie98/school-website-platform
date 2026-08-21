from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.tenant import current_school
from app.models.content import (
    Announcement,
    Department,
    Document,
    Event,
    GalleryAlbum,
    HomepageSection,
    MediaAsset,
    NewsArticle,
    Page,
    SiteBundle,
    StaffMember,
)
from app.models.school import School
from app.services.feature_service import feature_enabled, parse_flags
from app.services.site_service import assemble_site, event_to_public, news_to_public
from app.tenant import list_owned

router = APIRouter(prefix="/api/public", tags=["public"])


def load_tenant_rows(db: Session, school_id: str) -> dict:
    albums = db.scalars(
        select(GalleryAlbum).where(GalleryAlbum.school_id == school_id).options(selectinload(GalleryAlbum.images))
    ).all()
    bundle = db.scalar(select(SiteBundle).where(SiteBundle.school_id == school_id))
    return {
        "news": list_owned(db, NewsArticle, school_id),
        "events": list_owned(db, Event, school_id),
        "staff": list_owned(db, StaffMember, school_id),
        "departments": list_owned(db, Department, school_id),
        "announcements": list_owned(db, Announcement, school_id),
        "documents": list_owned(db, Document, school_id),
        "media": list_owned(db, MediaAsset, school_id),
        "pages": list_owned(db, Page, school_id),
        "sections": list_owned(db, HomepageSection, school_id),
        "albums": albums,
        "bundle": bundle,
    }


@router.get("/tenants")
def public_tenants(db: Session = Depends(get_db)):
    rows = (
        db.query(School)
        .filter(School.status.in_(("active", "trial")))
        .order_by(School.name)
        .all()
    )
    return [{"slug": school.slug, "name": school.name, "status": school.status} for school in rows]


@router.get("/site")
def public_site(school: School = Depends(current_school), db: Session = Depends(get_db)):
    return assemble_site(school, school.settings, load_tenant_rows(db, school.id), public=True)


@router.get("/news")
def public_news(school: School = Depends(current_school), db: Session = Depends(get_db)):
    flags = parse_flags(school.feature_flags)
    if not feature_enabled(flags, "news"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    items = [news_to_public(item) for item in list_owned(db, NewsArticle, school.id)]
    return [item for item in items if item.get("status") == "published"]


@router.get("/events")
def public_events(school: School = Depends(current_school), db: Session = Depends(get_db)):
    flags = parse_flags(school.feature_flags)
    if not feature_enabled(flags, "events"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    items = [event_to_public(item) for item in list_owned(db, Event, school.id)]
    return [item for item in items if item.get("status") in {"published", "completed"}]
