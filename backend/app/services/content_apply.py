"""Apply approved content changes to live tenant records."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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
from app.models.school import School, SchoolSettings
from app.models.user import new_id
from app.services.section_service import replace_sections, serialize_section
from app.services.site_service import event_to_public, news_to_public, staff_to_public
from app.services.theme_service import apply_preset_defaults, serialize_settings, sync_contact_columns, validate_font, validate_theme
from app.tenant import get_owned
from app.util.jsonutil import dumps, loads, now_iso
from app.models.approval import (
    RESOURCE_ANNOUNCEMENT,
    RESOURCE_BRANDING,
    RESOURCE_CONTACT,
    RESOURCE_DEPARTMENT,
    RESOURCE_DOCUMENT,
    RESOURCE_EVENT,
    RESOURCE_GALLERY,
    RESOURCE_HOMEPAGE,
    RESOURCE_HOMEPAGE_SECTIONS,
    RESOURCE_MEDIA,
    RESOURCE_NAVIGATION,
    RESOURCE_NEWS,
    RESOURCE_PAGE,
    RESOURCE_PRINCIPAL_MESSAGE,
    RESOURCE_STAFF,
)


SKIP_DIFF_KEYS = {
    "id", "school_id", "schoolId", "createdAt", "updatedAt", "created_at", "updated_at",
    "payload", "seed_source",
}


def title_from(resource_type: str, data: dict | None, fallback: str = "Untitled") -> str:
    if not data:
        return fallback
    for key in ("title", "name", "headline", "messageTitle", "schoolName"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()[:255]
    if resource_type == RESOURCE_PRINCIPAL_MESSAGE:
        return "Principal's Message"
    if resource_type == RESOURCE_CONTACT:
        return "Contact Details"
    if resource_type == RESOURCE_HOMEPAGE:
        return "Homepage"
    if resource_type == RESOURCE_BRANDING:
        return "Branding"
    return fallback


def snapshot(db: Session, school_id: str, resource_type: str, resource_id: str | None) -> dict[str, Any]:
    if not resource_id and resource_type not in {
        RESOURCE_HOMEPAGE, RESOURCE_PRINCIPAL_MESSAGE, RESOURCE_CONTACT, RESOURCE_BRANDING,
        RESOURCE_HOMEPAGE_SECTIONS, RESOURCE_NAVIGATION,
    }:
        return {}
    if resource_type == RESOURCE_NEWS:
        return news_to_public(get_owned(db, NewsArticle, resource_id, school_id))
    if resource_type == RESOURCE_EVENT:
        return event_to_public(get_owned(db, Event, resource_id, school_id))
    if resource_type == RESOURCE_STAFF:
        return staff_to_public(get_owned(db, StaffMember, resource_id, school_id))
    if resource_type == RESOURCE_PAGE:
        row = get_owned(db, Page, resource_id, school_id)
        return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status, "body": loads(row.body)}
    if resource_type == RESOURCE_DOCUMENT:
        row = get_owned(db, Document, resource_id, school_id)
        return {"id": row.id, "name": row.name, "status": row.status, **loads(row.payload)}
    if resource_type == RESOURCE_GALLERY:
        row = get_owned(db, GalleryAlbum, resource_id, school_id)
        return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status, **loads(row.payload)}
    if resource_type == RESOURCE_MEDIA:
        row = get_owned(db, MediaAsset, resource_id, school_id)
        return {"id": row.id, "url": row.url, "name": row.filename, "alt": row.alt, "kind": row.kind}
    if resource_type == RESOURCE_ANNOUNCEMENT:
        row = get_owned(db, Announcement, resource_id, school_id)
        return {"id": row.id, "title": row.title, "message": row.message, "active": row.active, **loads(row.payload)}
    if resource_type == RESOURCE_DEPARTMENT:
        row = get_owned(db, Department, resource_id, school_id)
        return {"id": row.id, "slug": row.slug, "name": row.name, "status": row.status, **loads(row.payload)}
    if resource_type == RESOURCE_HOMEPAGE:
        payload = _bundle_key(db, school_id, "homepage")
        stats = _bundle_key(db, school_id, "statistics")
        return {"homepage": payload, "statistics": stats}
    if resource_type == RESOURCE_PRINCIPAL_MESSAGE:
        return _bundle_key(db, school_id, "principal")
    if resource_type == RESOURCE_NAVIGATION:
        return {"navigation": _bundle_key(db, school_id, "navigation")}
    if resource_type == RESOURCE_CONTACT:
        school = db.get(School, school_id)
        return loads(school.settings.contact_json) if school and school.settings else {}
    if resource_type == RESOURCE_BRANDING:
        school = db.get(School, school_id)
        if school is None:
            return {}
        return serialize_settings(school, school.settings)
    if resource_type == RESOURCE_HOMEPAGE_SECTIONS:
        rows = db.query(HomepageSection).filter(HomepageSection.school_id == school_id).order_by(HomepageSection.position).all()
        return {"sections": [serialize_section(row) for row in rows]}
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown content type")


def apply_create(db: Session, school_id: str, resource_type: str, data: dict) -> dict:
    if resource_type == RESOURCE_NEWS:
        row = _write_news(db, school_id, data)
        db.add(row)
        db.flush()
        return news_to_public(row)
    if resource_type == RESOURCE_EVENT:
        row = _write_event(db, school_id, data)
        db.add(row)
        db.flush()
        return event_to_public(row)
    if resource_type == RESOURCE_STAFF:
        row = _write_staff(db, school_id, data)
        db.add(row)
        db.flush()
        return staff_to_public(row)
    if resource_type == RESOURCE_PAGE:
        row = Page(
            id=data.get("id") or new_id(), school_id=school_id,
            slug=data.get("slug") or "page", title=data.get("title") or "Page",
            body=dumps(data.get("body", data)), status=data.get("status") or "published",
        )
        db.add(row)
        db.flush()
        return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status}
    if resource_type == RESOURCE_DOCUMENT:
        row = Document(
            id=data.get("id") or new_id(), school_id=school_id,
            name=data.get("name") or "Document", payload=dumps(data),
            status=data.get("status") or "published",
        )
        db.add(row)
        db.flush()
        return {"id": row.id, "name": row.name, "status": row.status}
    if resource_type == RESOURCE_GALLERY:
        row = GalleryAlbum(
            id=data.get("id") or new_id(), school_id=school_id,
            slug=data.get("slug") or "album", title=data.get("title") or "Album",
            payload=dumps(data), status=data.get("status") or "published",
        )
        db.add(row)
        db.flush()
        return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status}
    if resource_type == RESOURCE_ANNOUNCEMENT:
        row = Announcement(
            id=data.get("id") or new_id(), school_id=school_id,
            title=data.get("title") or "", message=data.get("message") or "",
            payload=dumps(data), active=bool(data.get("active", True)),
        )
        db.add(row)
        db.flush()
        return {"id": row.id, "title": row.title, "message": row.message, "active": row.active}
    if resource_type == RESOURCE_DEPARTMENT:
        row = Department(
            id=data.get("id") or new_id(), school_id=school_id,
            slug=data.get("slug") or "department", name=data.get("name") or "Department",
            payload=dumps(data), status=data.get("status") or "active",
        )
        db.add(row)
        db.flush()
        return {"id": row.id, "slug": row.slug, "name": row.name, "status": row.status}
    if resource_type in {RESOURCE_HOMEPAGE, RESOURCE_PRINCIPAL_MESSAGE, RESOURCE_NAVIGATION, RESOURCE_CONTACT, RESOURCE_BRANDING, RESOURCE_HOMEPAGE_SECTIONS}:
        return apply_update(db, school_id, resource_type, "current", data)
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "This content type cannot be created through approvals")


def apply_update(db: Session, school_id: str, resource_type: str, resource_id: str, data: dict) -> dict:
    if resource_type == RESOURCE_NEWS:
        row = get_owned(db, NewsArticle, resource_id, school_id)
        _write_news(db, school_id, data, row)
        db.flush()
        return news_to_public(row)
    if resource_type == RESOURCE_EVENT:
        row = get_owned(db, Event, resource_id, school_id)
        _write_event(db, school_id, data, row)
        db.flush()
        return event_to_public(row)
    if resource_type == RESOURCE_STAFF:
        row = get_owned(db, StaffMember, resource_id, school_id)
        _write_staff(db, school_id, data, row)
        db.flush()
        return staff_to_public(row)
    if resource_type == RESOURCE_PAGE:
        row = get_owned(db, Page, resource_id, school_id)
        row.slug = data.get("slug", row.slug)
        row.title = data.get("title", row.title)
        row.status = data.get("status", row.status)
        row.body = dumps(data.get("body", data))
        db.flush()
        return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status}
    if resource_type == RESOURCE_DOCUMENT:
        row = get_owned(db, Document, resource_id, school_id)
        row.name = data.get("name", row.name)
        row.status = data.get("status", row.status)
        row.payload = dumps(data)
        db.flush()
        return {"id": row.id, "name": row.name, "status": row.status}
    if resource_type == RESOURCE_GALLERY:
        row = get_owned(db, GalleryAlbum, resource_id, school_id)
        row.slug = data.get("slug", row.slug)
        row.title = data.get("title", row.title)
        row.status = data.get("status", row.status)
        row.payload = dumps(data)
        db.flush()
        return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status}
    if resource_type == RESOURCE_ANNOUNCEMENT:
        row = get_owned(db, Announcement, resource_id, school_id)
        row.title = data.get("title", row.title)
        row.message = data.get("message", row.message)
        row.active = bool(data.get("active", row.active))
        row.payload = dumps(data)
        db.flush()
        return {"id": row.id, "title": row.title}
    if resource_type == RESOURCE_DEPARTMENT:
        row = get_owned(db, Department, resource_id, school_id)
        row.slug = data.get("slug", row.slug)
        row.name = data.get("name", row.name)
        row.status = data.get("status", row.status)
        row.payload = dumps(data)
        db.flush()
        return {"id": row.id, "name": row.name}
    if resource_type == RESOURCE_HOMEPAGE:
        if "homepage" in data or "heroTitle" in data:
            _set_bundle_key(db, school_id, "homepage", data.get("homepage") if "homepage" in data else {k: v for k, v in data.items() if k != "statistics"})
        if "statistics" in data:
            _set_bundle_key(db, school_id, "statistics", data["statistics"])
        return {"id": "current"}
    if resource_type == RESOURCE_PRINCIPAL_MESSAGE:
        _set_bundle_key(db, school_id, "principal", data.get("principal", data))
        return {"id": "current"}
    if resource_type == RESOURCE_NAVIGATION:
        _set_bundle_key(db, school_id, "navigation", data.get("navigation", data))
        return {"id": "current"}
    if resource_type == RESOURCE_CONTACT:
        return apply_settings_body(db, school_id, {"contact": data.get("contact", data)})
    if resource_type == RESOURCE_BRANDING:
        return apply_settings_body(db, school_id, data)
    if resource_type == RESOURCE_HOMEPAGE_SECTIONS:
        rows = replace_sections(db, school_id, data.get("sections") or data)
        return [serialize_section(row) for row in sorted(rows, key=lambda item: item.position)]
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown content type")


def apply_delete(db: Session, school_id: str, resource_type: str, resource_id: str) -> None:
    model = {
        RESOURCE_NEWS: NewsArticle,
        RESOURCE_EVENT: Event,
        RESOURCE_STAFF: StaffMember,
        RESOURCE_PAGE: Page,
        RESOURCE_DOCUMENT: Document,
        RESOURCE_GALLERY: GalleryAlbum,
        RESOURCE_MEDIA: MediaAsset,
        RESOURCE_ANNOUNCEMENT: Announcement,
        RESOURCE_DEPARTMENT: Department,
    }.get(resource_type)
    if model is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This content type cannot be deleted through approvals")
    row = get_owned(db, model, resource_id, school_id)
    if resource_type == RESOURCE_MEDIA:
        from app.services.media_service import retire_file

        retire_file(getattr(row, "storage_key", "") or "")
    db.delete(row)
    db.flush()


def apply_settings_body(db: Session, school_id: str, body: dict) -> dict:
    school = db.get(School, school_id)
    if school is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "School not found")
    settings = school.settings
    if settings is None:
        settings = SchoolSettings(school_id=school.id, school_name=school.name)
        db.add(settings)
        db.flush()
    if "schoolName" in body:
        settings.school_name = body["schoolName"]
        school.name = body["schoolName"]
    if "shortName" in body:
        settings.short_name = body["shortName"]
    if "principalName" in body:
        settings.principal_name = body["principalName"]
    if "theme" in body:
        theme_id = validate_theme(body["theme"])
        settings.theme = theme_id
        school.theme = theme_id
        if body.get("applyPreset"):
            apply_preset_defaults(settings, theme_id, reset_fonts=True)
    if "headingFont" in body:
        settings.heading_font = validate_font(body["headingFont"], settings.heading_font)
    if "bodyFont" in body:
        settings.body_font = validate_font(body["bodyFont"], settings.body_font)
    for key, attr in {
        "motto": "motto",
        "primaryColor": "primary_color",
        "secondaryColor": "secondary_color",
        "accentColor": "accent_color",
        "logoUrl": "logo_url",
        "faviconUrl": "favicon_url",
        "heroStyle": "hero_style",
        "newsLayout": "news_layout",
        "eventsLayout": "events_layout",
        "footerStyle": "footer_style",
        "navbarStyle": "navbar_style",
        "facebookUrl": "facebook_url",
        "instagramUrl": "instagram_url",
        "youtubeUrl": "youtube_url",
        "tiktokUrl": "tiktok_url",
        "address": "address",
        "phone": "phone",
        "email": "email",
    }.items():
        if key in body:
            setattr(settings, attr, body[key])
    if "primaryColor" in body:
        school.primary_color = body["primaryColor"]
        settings.primary_color = body["primaryColor"]
    if "secondaryColor" in body:
        school.secondary_color = body["secondaryColor"]
        settings.secondary_color = body["secondaryColor"]
    if "accentColor" in body:
        school.accent_color = body["accentColor"]
        settings.accent_color = body["accentColor"]
    if "logoUrl" in body:
        school.logo_url = body["logoUrl"]
    if "faviconUrl" in body:
        school.favicon_url = body["faviconUrl"]
    if "contact" in body:
        settings.contact_json = dumps(body["contact"])
        sync_contact_columns(settings, body["contact"])
        if body["contact"].get("schoolName"):
            school.name = body["contact"]["schoolName"]
    if "branding" in body:
        branding = body["branding"]
        settings.branding_json = dumps(branding)
        if branding.get("crestUrl") and "logoUrl" not in body:
            settings.logo_url = branding["crestUrl"]
            school.logo_url = branding["crestUrl"]
        if branding.get("faviconUrl") and "faviconUrl" not in body:
            settings.favicon_url = branding["faviconUrl"]
            school.favicon_url = branding["faviconUrl"]
    db.flush()
    return serialize_settings(school, settings)


def changed_fields(old: dict | None, new: dict | None) -> list[dict]:
    old = old or {}
    new = new or {}
    keys = sorted(set(old) | set(new))
    diffs = []
    for key in keys:
        if key in SKIP_DIFF_KEYS:
            continue
        left, right = old.get(key), new.get(key)
        if left == right:
            continue
        diffs.append({"field": _label(key), "key": key, "from": left, "to": right})
    return diffs


def _label(key: str) -> str:
    mapping = {
        "title": "Title", "name": "Name", "excerpt": "Summary", "content": "Body",
        "description": "Description", "date": "Date", "startTime": "Start time",
        "endTime": "End time", "location": "Location", "category": "Category",
        "author": "Author", "image": "Image", "status": "Status", "role": "Position",
        "department": "Department", "bio": "Biography", "photo": "Photo",
        "message": "Message", "active": "Active", "phone": "Phone",
        "addressLines": "Address", "officeHours": "Office hours",
        "generalEmail": "Email", "motto": "Motto",
    }
    return mapping.get(key, key.replace("_", " ").title())


def _bundle(db: Session, school_id: str) -> SiteBundle:
    row = db.query(SiteBundle).filter(SiteBundle.school_id == school_id).first()
    if row is None:
        row = SiteBundle(school_id=school_id, payload="{}")
        db.add(row)
        db.flush()
    return row


def _bundle_key(db: Session, school_id: str, key: str) -> Any:
    payload = loads(_bundle(db, school_id).payload)
    return payload.get(key) or {}


def _set_bundle_key(db: Session, school_id: str, key: str, value: Any) -> None:
    row = _bundle(db, school_id)
    payload = loads(row.payload)
    payload[key] = value
    row.payload = dumps(payload)
    db.flush()


def _write_news(db: Session, school_id: str, data: dict, existing: NewsArticle | None = None) -> NewsArticle:
    row = existing or NewsArticle(id=data.get("id") or new_id(), school_id=school_id)
    row.slug = data.get("slug") or row.slug or "item"
    row.title = data.get("title") or row.title or "Untitled"
    row.excerpt = data.get("excerpt") or ""
    content = data.get("content") or ""
    row.content = "".join(f"<p>{p}</p>" for p in content) if isinstance(content, list) else content
    row.category = data.get("category") or "General"
    row.author = data.get("author") or ""
    row.image = data.get("image") or ""
    row.image_alt = data.get("imageAlt") or data.get("image_alt") or ""
    row.status = data.get("status") or row.status or "published"
    row.is_featured = bool(data.get("isFeatured") or data.get("featured"))
    row.show_on_homepage = bool(data.get("showOnHomepage"))
    row.featured_priority = int(data.get("featuredPriority") or 0)
    row.date = data.get("date") or now_iso()[:10]
    row.published_at = data.get("publishedAt") or row.published_at
    extra = {k: v for k, v in data.items() if k not in {
        "id", "slug", "title", "excerpt", "content", "category", "author", "image", "imageAlt",
        "status", "isFeatured", "showOnHomepage", "featuredPriority", "date", "publishedAt", "school_id",
        "mode", "change", "record",
    }}
    row.payload = dumps(extra)
    row.school_id = school_id
    return row


def _write_event(db: Session, school_id: str, data: dict, existing: Event | None = None) -> Event:
    row = existing or Event(id=data.get("id") or new_id(), school_id=school_id)
    row.slug = data.get("slug") or row.slug or "event"
    row.title = data.get("title") or row.title or "Untitled"
    row.description = data.get("description") or ""
    row.date = data.get("date") or now_iso()[:10]
    row.status = data.get("status") or row.status or "published"
    reserved = {"id", "slug", "title", "description", "date", "status", "school_id", "mode", "change", "record"}
    row.payload = dumps({k: v for k, v in data.items() if k not in reserved})
    row.school_id = school_id
    return row


def _write_staff(db: Session, school_id: str, data: dict, existing: StaffMember | None = None) -> StaffMember:
    row = existing or StaffMember(id=data.get("id") or new_id(), school_id=school_id)
    row.name = data.get("name") or row.name or "Staff member"
    row.role = data.get("role") or row.role or ""
    row.department = data.get("department") or row.department or ""
    row.status = data.get("status") or row.status or "active"
    reserved = {"id", "name", "role", "department", "status", "school_id", "mode", "change", "record"}
    row.payload = dumps({k: v for k, v in data.items() if k not in reserved})
    row.school_id = school_id
    return row
