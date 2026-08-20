from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_school_admin, require_school_user, school_id_for
from app.models.content import (
    Document,
    Event,
    GalleryAlbum,
    HomepageSection,
    MediaAsset,
    NewsArticle,
    Page,
    StaffMember,
)
from app.models.school import School
from app.models.approval import (
    ACTION_CREATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AUDIT_USER_CREATED,
    AUDIT_USER_DISABLED,
    AUDIT_USER_ENABLED,
    AUDIT_USER_PASSWORD_CHANGED,
    AUDIT_USER_ROLE_CHANGED,
    AUDIT_USER_UPDATED,
    RESOURCE_BRANDING,
    RESOURCE_CONTACT,
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
    RESOURCE_USER,
)
from app.models.user import EDITOR, PRINCIPAL, SCHOOL_ADMIN, SUPER_ADMIN, User
from app.services.approval_service import queue_or_publish
from app.services.audit_service import log_event
from app.services.content_apply import snapshot
from app.api.public.site import load_tenant_rows
from app.core.security import hash_password
from app.services.media_service import ALLOWED_DOCS, ALLOWED_IMAGE, store_upload
from app.services.section_service import catalog_payload, serialize_section
from app.services.site_service import assemble_site, event_to_public, news_to_public, staff_to_public
from app.services.theme_service import list_theme_presets, serialize_settings
from app.tenant import get_owned, list_owned
from app.util.jsonutil import loads

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _sid(user: User) -> str:
    return school_id_for(user)


@router.get("/site")
def admin_site(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    school = db.get(School, _sid(user))
    if school is None:
        raise HTTPException(status_code=404, detail="Not found")
    return assemble_site(school, school.settings, load_tenant_rows(db, school.id))


@router.get("/news")
def list_news(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [news_to_public(item) for item in list_owned(db, NewsArticle, _sid(user))]


@router.post("/news")
def create_news(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return queue_or_publish(
        db, user, resource_type=RESOURCE_NEWS, action=ACTION_CREATE, new_data=body,
        title=body.get("title") or "News article",
    )


@router.get("/news/{item_id}")
def get_news(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return news_to_public(get_owned(db, NewsArticle, item_id, _sid(user)))


@router.put("/news/{item_id}")
def update_news(item_id: str, body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, NewsArticle, item_id, _sid(user))
    return queue_or_publish(
        db, user, resource_type=RESOURCE_NEWS, action=ACTION_UPDATE, resource_id=item_id,
        old_data=news_to_public(row), new_data=body, title=body.get("title") or row.title,
    )


@router.delete("/news/{item_id}")
def delete_news(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, NewsArticle, item_id, _sid(user))
    return queue_or_publish(
        db, user, resource_type=RESOURCE_NEWS, action=ACTION_DELETE, resource_id=item_id,
        old_data=news_to_public(row), title=row.title,
    )


@router.get("/events")
def list_events(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [event_to_public(item) for item in list_owned(db, Event, _sid(user))]


@router.post("/events")
def create_event(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return queue_or_publish(db, user, resource_type=RESOURCE_EVENT, action=ACTION_CREATE, new_data=body, title=body.get("title") or "Event")


@router.get("/events/{item_id}")
def get_event(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return event_to_public(get_owned(db, Event, item_id, _sid(user)))


@router.put("/events/{item_id}")
def update_event(item_id: str, body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, Event, item_id, _sid(user))
    return queue_or_publish(
        db, user, resource_type=RESOURCE_EVENT, action=ACTION_UPDATE, resource_id=item_id,
        old_data=event_to_public(row), new_data=body, title=body.get("title") or row.title,
    )


@router.delete("/events/{item_id}")
def delete_event(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, Event, item_id, _sid(user))
    return queue_or_publish(
        db, user, resource_type=RESOURCE_EVENT, action=ACTION_DELETE, resource_id=item_id,
        old_data=event_to_public(row), title=row.title,
    )


@router.get("/staff")
def list_staff(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [staff_to_public(item) for item in list_owned(db, StaffMember, _sid(user))]


@router.post("/staff")
def create_staff(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return queue_or_publish(db, user, resource_type=RESOURCE_STAFF, action=ACTION_CREATE, new_data=body, title=body.get("name") or "Staff member")


@router.get("/staff/{item_id}")
def get_staff(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return staff_to_public(get_owned(db, StaffMember, item_id, _sid(user)))


@router.put("/staff/{item_id}")
def update_staff(item_id: str, body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, StaffMember, item_id, _sid(user))
    return queue_or_publish(
        db, user, resource_type=RESOURCE_STAFF, action=ACTION_UPDATE, resource_id=item_id,
        old_data=staff_to_public(row), new_data=body, title=body.get("name") or row.name,
    )


@router.delete("/staff/{item_id}")
def delete_staff(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, StaffMember, item_id, _sid(user))
    return queue_or_publish(
        db, user, resource_type=RESOURCE_STAFF, action=ACTION_DELETE, resource_id=item_id,
        old_data=staff_to_public(row), title=row.name,
    )


@router.get("/pages")
def list_pages(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [{"id": p.id, "slug": p.slug, "title": p.title, "status": p.status, "body": loads(p.body)} for p in list_owned(db, Page, _sid(user))]


@router.post("/pages")
def create_page(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return queue_or_publish(db, user, resource_type=RESOURCE_PAGE, action=ACTION_CREATE, new_data=body, title=body.get("title") or "Page")


@router.get("/pages/{item_id}")
def get_page(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, Page, item_id, _sid(user))
    return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status, "body": loads(row.body)}


@router.put("/pages/{item_id}")
def update_page(item_id: str, body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_PAGE, item_id)
    return queue_or_publish(
        db, user, resource_type=RESOURCE_PAGE, action=ACTION_UPDATE, resource_id=item_id,
        old_data=old, new_data=body, title=body.get("title") or old.get("title") or "Page",
    )


@router.delete("/pages/{item_id}")
def delete_page(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_PAGE, item_id)
    return queue_or_publish(db, user, resource_type=RESOURCE_PAGE, action=ACTION_DELETE, resource_id=item_id, old_data=old, title=old.get("title") or "Page")


@router.get("/galleries")
def list_galleries(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [{"id": a.id, "slug": a.slug, "title": a.title, "status": a.status, **loads(a.payload)} for a in list_owned(db, GalleryAlbum, _sid(user))]


@router.post("/galleries")
def create_gallery(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return queue_or_publish(db, user, resource_type=RESOURCE_GALLERY, action=ACTION_CREATE, new_data=body, title=body.get("title") or "Album")


@router.get("/galleries/{item_id}")
def get_gallery(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, GalleryAlbum, item_id, _sid(user))
    return {"id": row.id, "slug": row.slug, "title": row.title, "status": row.status, **loads(row.payload)}


@router.put("/galleries/{item_id}")
def update_gallery(item_id: str, body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_GALLERY, item_id)
    return queue_or_publish(
        db, user, resource_type=RESOURCE_GALLERY, action=ACTION_UPDATE, resource_id=item_id,
        old_data=old, new_data=body, title=body.get("title") or old.get("title") or "Album",
    )


@router.delete("/galleries/{item_id}")
def delete_gallery(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_GALLERY, item_id)
    return queue_or_publish(db, user, resource_type=RESOURCE_GALLERY, action=ACTION_DELETE, resource_id=item_id, old_data=old, title=old.get("title") or "Album")


@router.get("/documents")
def list_documents(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name, "status": d.status, **loads(d.payload)} for d in list_owned(db, Document, _sid(user))]


@router.post("/documents")
def create_document(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return queue_or_publish(db, user, resource_type=RESOURCE_DOCUMENT, action=ACTION_CREATE, new_data=body, title=body.get("name") or "Document")


@router.get("/documents/{item_id}")
def get_document(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, Document, item_id, _sid(user))
    return {"id": row.id, "name": row.name, "status": row.status, **loads(row.payload)}


@router.put("/documents/{item_id}")
def update_document(item_id: str, body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_DOCUMENT, item_id)
    return queue_or_publish(
        db, user, resource_type=RESOURCE_DOCUMENT, action=ACTION_UPDATE, resource_id=item_id,
        old_data=old, new_data=body, title=body.get("name") or old.get("name") or "Document",
    )


@router.delete("/documents/{item_id}")
def delete_document(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_DOCUMENT, item_id)
    return queue_or_publish(db, user, resource_type=RESOURCE_DOCUMENT, action=ACTION_DELETE, resource_id=item_id, old_data=old, title=old.get("name") or "Document")


@router.get("/media")
def list_media(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    return [
        {"id": m.id, "url": m.url, "name": m.filename, "mimeType": m.mime_type, "size": m.size, "kind": m.kind, "storageKey": m.storage_key}
        for m in list_owned(db, MediaAsset, _sid(user))
    ]


@router.post("/media")
async def upload_media(
    user: User = Depends(require_school_user),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    folder: str = Query("uploads"),
):
    from app.services.media_service import ALLOWED_DOCS, ALLOWED_IMAGE, store_upload
    from app.core.request_context import bind_user

    bind_user(user)
    kind = folder if folder in {"uploads", "logos", "news", "events", "gallery", "documents"} else "uploads"
    stored = await store_upload(_sid(user), kind, file, ALLOWED_IMAGE | ALLOWED_DOCS)
    row = MediaAsset(
        school_id=_sid(user),
        filename=stored["filename"],
        storage_key=stored["storage_key"],
        url=stored["url"],
        mime_type=stored["mime_type"],
        size=stored["size"],
        uploaded_by=user.id,
        kind="image" if (file.content_type or "").startswith("image/") else "document",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "url": row.url, "name": row.filename, "mimeType": row.mime_type, "size": row.size, "kind": row.kind}


@router.get("/media/{item_id}")
def get_media(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    row = get_owned(db, MediaAsset, item_id, _sid(user))
    return {"id": row.id, "url": row.url, "name": row.filename, "storageKey": row.storage_key}


@router.delete("/media/{item_id}")
def delete_media(item_id: str, user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_MEDIA, item_id)
    return queue_or_publish(db, user, resource_type=RESOURCE_MEDIA, action=ACTION_DELETE, resource_id=item_id, old_data=old, title=old.get("name") or "Media")


def _school_role(value: str | None) -> str:
    role_raw = str(value or EDITOR).strip().lower().replace(" ", "_").replace("-", "_")
    if role_raw in {SUPER_ADMIN, "super_admin"}:
        raise HTTPException(status_code=403, detail="Cannot assign platform role")
    if role_raw in {SCHOOL_ADMIN, "administrator", "admin"}:
        return SCHOOL_ADMIN
    if role_raw in {PRINCIPAL}:
        return PRINCIPAL
    return EDITOR


def _assignable_role(actor: User, value: str | None) -> str:
    role = _school_role(value)
    if actor.role == PRINCIPAL:
        return role
    if role != EDITOR:
        raise HTTPException(status_code=403, detail="Administrators can only assign the editor role")
    return EDITOR


def _assert_can_manage_user(actor: User, target: User) -> None:
    if actor.role == PRINCIPAL:
        return
    if target.role == PRINCIPAL:
        raise HTTPException(status_code=403, detail="Administrators cannot change a principal account")
    if target.role != EDITOR:
        raise HTTPException(status_code=403, detail="Administrators can only manage editors")


def _user_snapshot(row: User) -> dict[str, Any]:
    return {"name": row.name, "email": row.email, "role": row.role, "status": "active" if row.is_active else "disabled"}


def _public_user(row: User) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "email": row.email,
        "role": row.role,
        "status": "active" if row.is_active else "disabled",
        "is_active": row.is_active,
    }


@router.get("/users")
def list_users(user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.school_id == _sid(user)).order_by(User.name).all()
    return [_public_user(row) for row in rows]


@router.post("/users")
def create_user(body: dict[str, Any], user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    email = (body.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="That email is already in use")
    password = body.get("password") or ""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    row = User(
        school_id=_sid(user),
        name=(body.get("name") or "User").strip() or "User",
        email=email,
        password_hash=hash_password(password),
        role=_assignable_role(user, body.get("role")),
        is_active=True,
    )
    db.add(row)
    db.flush()
    log_event(
        db,
        actor=user,
        action=AUDIT_USER_CREATED,
        resource_type=RESOURCE_USER,
        resource_id=row.id,
        resource_name=row.name,
        new_data=_user_snapshot(row),
        status_after="active",
        metadata={"email": row.email, "role": row.role},
    )
    db.commit()
    db.refresh(row)
    return _public_user(row)


@router.put("/users/{item_id}")
def update_user(item_id: str, body: dict[str, Any], user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    row = db.get(User, item_id)
    if row is None or row.school_id != _sid(user):
        raise HTTPException(status_code=404, detail="Not found")
    _assert_can_manage_user(user, row)
    before = _user_snapshot(row)
    previous_role = row.role
    previous_active = row.is_active
    password_changed = False
    if "name" in body and body["name"]:
        row.name = str(body["name"]).strip()
    if "email" in body and body["email"]:
        email = str(body["email"]).strip().lower()
        taken = db.query(User).filter(User.email == email, User.id != row.id).first()
        if taken:
            raise HTTPException(status_code=400, detail="That email is already in use")
        row.email = email
    if "role" in body:
        row.role = _assignable_role(user, body["role"])
    if "is_active" in body:
        row.is_active = bool(body["is_active"])
    if "status" in body:
        row.is_active = str(body["status"]).lower() == "active"
    if body.get("password"):
        if len(str(body["password"])) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        row.password_hash = hash_password(body["password"])
        password_changed = True
    after = _user_snapshot(row)
    if previous_role != row.role:
        log_event(
            db, actor=user, action=AUDIT_USER_ROLE_CHANGED, resource_type=RESOURCE_USER,
            resource_id=row.id, resource_name=row.name, old_data=before, new_data=after,
            metadata={"from": previous_role, "to": row.role},
        )
    if previous_active and not row.is_active:
        log_event(
            db, actor=user, action=AUDIT_USER_DISABLED, resource_type=RESOURCE_USER,
            resource_id=row.id, resource_name=row.name, old_data=before, new_data=after,
            status_before="active", status_after="disabled",
        )
    elif not previous_active and row.is_active:
        log_event(
            db, actor=user, action=AUDIT_USER_ENABLED, resource_type=RESOURCE_USER,
            resource_id=row.id, resource_name=row.name, old_data=before, new_data=after,
            status_before="disabled", status_after="active",
        )
    if password_changed:
        log_event(
            db, actor=user, action=AUDIT_USER_PASSWORD_CHANGED, resource_type=RESOURCE_USER,
            resource_id=row.id, resource_name=row.name, metadata={"passwordChanged": True},
        )
    if before != after and previous_role == row.role and previous_active == row.is_active:
        log_event(
            db, actor=user, action=AUDIT_USER_UPDATED, resource_type=RESOURCE_USER,
            resource_id=row.id, resource_name=row.name, old_data=before, new_data=after,
        )
    db.commit()
    return _public_user(row)


@router.delete("/users/{item_id}")
def delete_user(item_id: str, user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    row = db.get(User, item_id)
    if row is None or row.school_id != _sid(user):
        raise HTTPException(status_code=404, detail="Not found")
    if row.id == user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    _assert_can_manage_user(user, row)
    snapshot = _user_snapshot(row)
    log_event(
        db,
        actor=user,
        action=AUDIT_USER_DISABLED,
        resource_type=RESOURCE_USER,
        resource_id=row.id,
        resource_name=row.name,
        old_data=snapshot,
        status_before="active" if row.is_active else "disabled",
        status_after="deleted",
        metadata={"deleted": True, "email": row.email},
    )
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/themes")
def list_themes(_user: User = Depends(require_school_user)):
    return list_theme_presets()


@router.get("/settings")
def get_settings(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    school = db.get(School, _sid(user))
    if school is None:
        raise HTTPException(status_code=404, detail="Not found")
    payload = serialize_settings(school, school.settings)
    payload.update({
        "primaryColor": school.settings.primary_color if school.settings else school.primary_color,
        "secondaryColor": school.settings.secondary_color if school.settings else school.secondary_color,
        "accentColor": school.settings.accent_color if school.settings else school.accent_color,
        "heroStyle": school.settings.hero_style if school.settings else "full-image",
        "navbarStyle": school.settings.navbar_style if school.settings else "classic",
        "newsLayout": school.settings.news_layout if school.settings else "featured",
        "eventsLayout": school.settings.events_layout if school.settings else "cards",
        "footerStyle": school.settings.footer_style if school.settings else "classic",
        "availableThemes": list_theme_presets(),
    })
    return {
        "school": {"id": school.id, "name": school.name, "slug": school.slug, "status": school.status, "theme": school.theme},
        "settings": payload,
    }


@router.put("/settings")
def update_settings(body: dict[str, Any], user: User = Depends(require_school_admin), db: Session = Depends(get_db)):
    keys = set(body.keys())
    if "contact" in body and keys <= {"contact"}:
        resource_type = RESOURCE_CONTACT
        title = "Contact Details"
        old = snapshot(db, _sid(user), RESOURCE_CONTACT, "current")
    else:
        resource_type = RESOURCE_BRANDING
        title = "Branding" if "branding" in body or "primaryColor" in body else "School settings"
        old = snapshot(db, _sid(user), RESOURCE_BRANDING, "current")
    return queue_or_publish(
        db, user, resource_type=resource_type, action=ACTION_UPDATE, resource_id="current",
        old_data=old if isinstance(old, dict) else {}, new_data=body, title=title,
    )


@router.put("/bundle")
def update_bundle(body: dict[str, Any], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    last = None
    if "homepage" in body or "statistics" in body:
        old = snapshot(db, _sid(user), RESOURCE_HOMEPAGE, "current")
        new_data: dict[str, Any] = {}
        if "homepage" in body:
            new_data["homepage"] = body["homepage"]
        if "statistics" in body:
            new_data["statistics"] = body["statistics"]
        last = queue_or_publish(
            db, user, resource_type=RESOURCE_HOMEPAGE, action=ACTION_UPDATE, resource_id="current",
            old_data=old if isinstance(old, dict) else {}, new_data=new_data, title="Homepage",
        )
    if "principal" in body:
        old = snapshot(db, _sid(user), RESOURCE_PRINCIPAL_MESSAGE, "current")
        last = queue_or_publish(
            db, user, resource_type=RESOURCE_PRINCIPAL_MESSAGE, action=ACTION_UPDATE, resource_id="current",
            old_data=old if isinstance(old, dict) else {}, new_data=body["principal"] if isinstance(body["principal"], dict) else {"principal": body["principal"]},
            title="Principal's Message",
        )
    if "navigation" in body:
        old = snapshot(db, _sid(user), RESOURCE_NAVIGATION, "current")
        last = queue_or_publish(
            db, user, resource_type=RESOURCE_NAVIGATION, action=ACTION_UPDATE, resource_id="current",
            old_data=old if isinstance(old, dict) else {}, new_data=body["navigation"] if isinstance(body["navigation"], dict) else {"navigation": body["navigation"]},
            title="Navigation",
        )
    if last is None:
        raise HTTPException(status_code=400, detail="No recognised homepage content to update")
    return last


@router.get("/section-catalog")
def section_catalog(_user: User = Depends(require_school_user)):
    return catalog_payload()


@router.get("/homepage-sections")
def list_homepage_sections(user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    rows = db.query(HomepageSection).filter(HomepageSection.school_id == _sid(user)).order_by(HomepageSection.position).all()
    return [serialize_section(row) for row in rows]


@router.put("/homepage-sections")
def save_homepage_sections(body: list[dict[str, Any]], user: User = Depends(require_school_user), db: Session = Depends(get_db)):
    old = snapshot(db, _sid(user), RESOURCE_HOMEPAGE_SECTIONS, "current")
    return queue_or_publish(
        db, user, resource_type=RESOURCE_HOMEPAGE_SECTIONS, action=ACTION_UPDATE, resource_id="current",
        old_data=old if isinstance(old, dict) else {}, new_data={"sections": body}, title="Homepage layout",
    )
