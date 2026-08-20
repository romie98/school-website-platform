from __future__ import annotations

import re
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.content import Document, Event, HomepageSection, MediaAsset, NewsArticle, SiteBundle, StaffMember
from app.models.school import School, SchoolDomain, SchoolSettings, SubscriptionPlan
from app.models.user import EDITOR, PRINCIPAL, SCHOOL_ADMIN, SUPER_ADMIN, User, new_id
from app.services.feature_service import DEFAULT_FEATURES, parse_flags
from app.services.media_service import school_prefix
from app.services.theme_service import THEME_PRESETS, apply_preset_defaults, validate_theme
from app.util.jsonutil import dumps

SCHOOL_STATUSES = {"trial", "active", "suspended", "archived"}
SUBSCRIPTION_STATUSES = {"trial", "active", "past_due", "cancelled"}
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DEFAULT_PLANS = [
    ("plan-starter", "Starter", "starter", 3, 1024),
    ("plan-professional", "Professional", "professional", 10, 5120),
    ("plan-enterprise", "Enterprise", "enterprise", 50, 20480),
]


def normalize_domain(value: str) -> str:
    raw = (value or "").strip().lower()
    raw = raw.replace("https://", "").replace("http://", "")
    raw = raw.split("/")[0]
    if raw.startswith("www."):
        raw = raw[4:]
    if ":" in raw:
        raw = raw.split(":")[0]
    return raw.strip()


def ensure_default_plans(db: Session) -> None:
    for plan_id, name, slug, max_admins, storage in DEFAULT_PLANS:
        if db.get(SubscriptionPlan, plan_id) is None and db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == slug).first() is None:
            db.add(SubscriptionPlan(id=plan_id, name=name, slug=slug, max_admins=max_admins, max_storage_mb=storage))
    db.flush()


def serialize_plan(plan: SubscriptionPlan | None) -> dict | None:
    if plan is None:
        return None
    return {
        "id": plan.id,
        "name": plan.name,
        "slug": plan.slug,
        "maxAdmins": plan.max_admins,
        "maxStorageMb": plan.max_storage_mb,
    }


def serialize_domain(row: SchoolDomain) -> dict:
    return {
        "id": row.id,
        "schoolId": row.school_id,
        "domain": row.domain,
        "isPrimary": row.is_primary,
        "verified": row.verified,
    }


def serialize_user(user: User, school_name: str | None = None) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "schoolId": user.school_id,
        "schoolName": school_name,
        "isActive": user.is_active,
    }


def storage_bytes_for(db: Session, school_id: str) -> int:
    db_total = db.query(func.coalesce(func.sum(MediaAsset.size), 0)).filter(MediaAsset.school_id == school_id).scalar() or 0
    disk_total = 0
    root = Path(get_settings().storage_dir).resolve() / "schools" / school_id
    if root.exists():
        disk_total = sum(path.stat().st_size for path in root.rglob("*") if path.is_file())
    return int(max(db_total, disk_total))


def school_counts(db: Session, school_id: str) -> dict:
    return {
        "news": db.query(NewsArticle).filter(NewsArticle.school_id == school_id).count(),
        "events": db.query(Event).filter(Event.school_id == school_id).count(),
        "staff": db.query(StaffMember).filter(StaffMember.school_id == school_id).count(),
        "documents": db.query(Document).filter(Document.school_id == school_id).count(),
        "media": db.query(MediaAsset).filter(MediaAsset.school_id == school_id).count(),
        "users": db.query(User).filter(User.school_id == school_id).count(),
    }


def serialize_school(db: Session, school: School, *, detail: bool = False) -> dict:
    plan = db.get(SubscriptionPlan, school.subscription_plan_id) if school.subscription_plan_id else None
    settings = school.settings
    payload = {
        "id": school.id,
        "name": school.name,
        "slug": school.slug,
        "status": school.status,
        "domain": school.domain,
        "customDomain": school.custom_domain,
        "theme": (settings.theme if settings else None) or school.theme,
        "primaryColor": (settings.primary_color if settings else None) or school.primary_color,
        "secondaryColor": (settings.secondary_color if settings else None) or school.secondary_color,
        "accentColor": (settings.accent_color if settings else None) or school.accent_color,
        "motto": settings.motto if settings else None,
        "plan": serialize_plan(plan),
        "subscriptionStatus": school.subscription_status,
        "features": parse_flags(school.feature_flags),
        "storageBytes": storage_bytes_for(db, school.id),
        "adminCount": db.query(User).filter(User.school_id == school.id, User.role == SCHOOL_ADMIN).count(),
    }
    if detail:
        payload["domains"] = [serialize_domain(row) for row in sorted(school.domains, key=lambda item: (not item.is_primary, item.domain))]
        payload["users"] = [serialize_user(user, school.name) for user in school.users]
        payload["counts"] = school_counts(db, school.id)
        payload["settings"] = {
            "headingFont": settings.heading_font if settings else "Montserrat",
            "bodyFont": settings.body_font if settings else "Inter",
            "heroStyle": settings.hero_style if settings else "full-image",
            "navbarStyle": settings.navbar_style if settings else "classic",
        }
    return payload


def validate_slug(slug: str) -> str:
    value = (slug or "").strip().lower()
    if not SLUG_RE.match(value):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Slug must be lowercase letters, numbers, and hyphens")
    return value


def assert_slug_free(db: Session, slug: str, *, exclude_id: str | None = None) -> None:
    row = db.query(School).filter(School.slug == slug).first()
    if row and row.id != exclude_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A school with this slug already exists")


def domain_conflict(db: Session, domain: str, *, exclude_school_id: str | None = None, exclude_domain_id: str | None = None) -> bool:
    query = db.query(SchoolDomain).filter(SchoolDomain.domain == domain)
    if exclude_domain_id:
        query = query.filter(SchoolDomain.id != exclude_domain_id)
    if query.first():
        return True
    school_query = db.query(School).filter(or_(School.domain == domain, School.custom_domain == domain))
    if exclude_school_id:
        school_query = school_query.filter(School.id != exclude_school_id)
    return school_query.first() is not None


def assert_domain_free(db: Session, domain: str, *, exclude_school_id: str | None = None, exclude_domain_id: str | None = None) -> None:
    if domain_conflict(db, domain, exclude_school_id=exclude_school_id, exclude_domain_id=exclude_domain_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That domain is already assigned")


def platform_subdomain(slug: str) -> str:
    return f"{slug}.{get_settings().platform_domain.lower()}"


def seed_starter_site(db: Session, school: School, settings: SchoolSettings) -> None:
    hero = settings.hero_style or "full-image"
    news = settings.news_layout or "featured"
    events = settings.events_layout or "cards"
    for index, (section_type, variant) in enumerate([
        ("hero", hero),
        ("welcome", "default"),
        ("news", news),
        ("events", events),
        ("cta", "default"),
    ]):
        db.add(HomepageSection(school_id=school.id, section_type=section_type, variant=variant, position=index, enabled=True))
    db.add(SiteBundle(school_id=school.id, payload=dumps({
        "homepage": {
            "heroTitle": school.name,
            "heroTagline": settings.motto or "Welcome",
            "heroEyebrow": settings.short_name or school.name,
            "heroImage": "",
            "primaryButtonLabel": "Explore Our School",
            "primaryButtonUrl": "/about",
            "secondaryButtonLabel": "Admissions",
            "secondaryButtonUrl": "/admissions",
            "welcomeTitle": f"Welcome to {school.name}",
            "welcomeBody": [f"{school.name} is now on the school website platform."],
            "welcomeImage": "",
            "welcomeButtonLabel": "Learn More About Us",
            "welcomeButtonUrl": "/about",
        },
        "principal": {
            "name": settings.principal_name or "Principal",
            "title": "Principal",
            "excerpt": f"Welcome to {school.name}.",
            "content": f"<p>Welcome to {school.name}.</p>",
            "paragraphs": [],
            "signature": settings.principal_name or "Principal",
            "photo": "",
            "messageTitle": "Welcome",
        },
        "statistics": [],
        "navigation": [],
    })))
    school_prefix(school.id, "uploads")


def create_school(db: Session, body: dict) -> School:
    ensure_default_plans(db)
    slug = validate_slug(body.get("slug") or "")
    assert_slug_free(db, slug)
    theme = validate_theme(body.get("theme"))
    preset = THEME_PRESETS[theme]
    status_value = (body.get("status") or "trial").strip().lower()
    if status_value not in SCHOOL_STATUSES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown school status")
    custom = normalize_domain(body.get("customDomain") or body.get("custom_domain") or "")
    platform_host = platform_subdomain(slug)
    if custom:
        assert_domain_free(db, custom)
    assert_domain_free(db, platform_host)

    admin_email = (body.get("adminEmail") or "").strip().lower()
    admin_password = body.get("adminPassword") or ""
    if not admin_email or "@" not in admin_email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A school administrator email is required")
    if len(admin_password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Administrator password must be at least 8 characters")
    if db.query(User).filter(User.email == admin_email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That administrator email is already in use")

    plan_id = body.get("subscriptionPlanId") or body.get("planId") or "plan-professional"
    plan = db.get(SubscriptionPlan, plan_id) or db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == plan_id).first()
    features = {**DEFAULT_FEATURES, **(body.get("features") or {})}

    school = School(
        id=new_id(),
        name=(body.get("name") or slug).strip(),
        slug=slug,
        domain=platform_host,
        custom_domain=custom or None,
        primary_color=body.get("primaryColor") or preset.get("primaryColor") or "#0B3D2E",
        secondary_color=body.get("secondaryColor") or preset.get("secondaryColor") or "#FFD100",
        accent_color=body.get("accentColor") or preset.get("accentColor") or "#145C45",
        theme=theme,
        status=status_value,
        subscription_plan_id=plan.id if plan else None,
        subscription_status=body.get("subscriptionStatus") or ("trial" if status_value == "trial" else "active"),
        feature_flags=dumps(features),
    )
    db.add(school)
    db.flush()

    settings = SchoolSettings(
        school_id=school.id,
        school_name=school.name,
        short_name=body.get("shortName") or school.name,
        motto=body.get("motto") or "",
        primary_color=school.primary_color,
        secondary_color=school.secondary_color,
        accent_color=school.accent_color,
        theme=theme,
        heading_font=preset["headingFont"],
        body_font=preset["bodyFont"],
    )
    apply_preset_defaults(settings, theme)
    db.add(settings)

    db.add(SchoolDomain(school_id=school.id, domain=platform_host, is_primary=not custom, verified=True))
    if custom:
        db.add(SchoolDomain(school_id=school.id, domain=custom, is_primary=True, verified=bool(body.get("domainVerified"))))

    db.add(User(
        school_id=school.id,
        name=body.get("adminName") or f"{school.name} Administrator",
        email=admin_email,
        password_hash=hash_password(admin_password),
        role=SCHOOL_ADMIN,
        is_active=True,
    ))
    seed_starter_site(db, school, settings)
    db.commit()
    db.refresh(school)
    return school


def update_school(db: Session, school: School, body: dict) -> School:
    if "name" in body and body["name"]:
        school.name = str(body["name"]).strip()
        if school.settings:
            school.settings.school_name = school.name
    if "status" in body:
        value = str(body["status"]).strip().lower()
        if value not in SCHOOL_STATUSES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown school status")
        school.status = value
    if "theme" in body:
        theme = validate_theme(body["theme"])
        school.theme = theme
        if school.settings:
            apply_preset_defaults(school.settings, theme, reset_fonts=bool(body.get("resetThemeDefaults", True)))
    for key, attr in {
        "primaryColor": "primary_color",
        "secondaryColor": "secondary_color",
        "accentColor": "accent_color",
        "motto": "motto",
        "shortName": "short_name",
    }.items():
        if key in body and school.settings is not None:
            setattr(school.settings, attr, body[key])
            if attr in {"primary_color", "secondary_color", "accent_color"}:
                setattr(school, attr, body[key])
    if "features" in body and isinstance(body["features"], dict):
        school.feature_flags = dumps({**parse_flags(school.feature_flags), **body["features"]})
    if "subscriptionStatus" in body:
        value = str(body["subscriptionStatus"]).strip().lower()
        if value not in SUBSCRIPTION_STATUSES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown subscription status")
        school.subscription_status = value
    if "subscriptionPlanId" in body or "planId" in body:
        plan_id = body.get("subscriptionPlanId") or body.get("planId")
        plan = db.get(SubscriptionPlan, plan_id) if plan_id else None
        if plan_id and plan is None:
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == plan_id).first()
        if plan_id and plan is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown plan")
        school.subscription_plan_id = plan.id if plan else None
    if "customDomain" in body:
        custom = normalize_domain(body.get("customDomain") or "")
        if custom:
            assert_domain_free(db, custom, exclude_school_id=school.id)
            existing = next((row for row in school.domains if row.domain == custom), None)
            if existing is None:
                db.add(SchoolDomain(school_id=school.id, domain=custom, is_primary=True, verified=False))
            set_primary_domain(db, school, custom)
        school.custom_domain = custom or None
    db.commit()
    db.refresh(school)
    return school


def add_domain(db: Session, school: School, body: dict) -> SchoolDomain:
    domain = normalize_domain(body.get("domain") or "")
    if not domain or "." not in domain:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A valid domain is required")
    assert_domain_free(db, domain, exclude_school_id=school.id)
    row = SchoolDomain(
        school_id=school.id,
        domain=domain,
        is_primary=bool(body.get("isPrimary")),
        verified=bool(body.get("verified")),
    )
    db.add(row)
    db.flush()
    db.refresh(school)
    if row.is_primary:
        set_primary_domain(db, school, domain)
    db.commit()
    db.refresh(row)
    return row


def update_domain(db: Session, school: School, domain_id: str, body: dict) -> SchoolDomain:
    row = db.get(SchoolDomain, domain_id)
    if row is None or row.school_id != school.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if "verified" in body:
        row.verified = bool(body["verified"])
    if "domain" in body:
        domain = normalize_domain(body["domain"])
        if not domain:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A valid domain is required")
        assert_domain_free(db, domain, exclude_school_id=school.id, exclude_domain_id=row.id)
        row.domain = domain
    if body.get("isPrimary"):
        set_primary_domain(db, school, row.domain)
    db.commit()
    db.refresh(row)
    return row


def delete_domain(db: Session, school: School, domain_id: str) -> None:
    row = db.get(SchoolDomain, domain_id)
    if row is None or row.school_id != school.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if row.domain == school.domain:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The platform subdomain cannot be removed")
    was_primary = row.is_primary
    db.delete(row)
    if school.custom_domain == row.domain:
        school.custom_domain = None
    if was_primary:
        fallback = next((item for item in school.domains if item.id != row.id), None)
        if fallback:
            fallback.is_primary = True
            if fallback.domain != school.domain:
                school.custom_domain = fallback.domain
    db.commit()


def set_primary_domain(db: Session, school: School, domain: str) -> None:
    for item in school.domains:
        item.is_primary = item.domain == domain
    if domain != school.domain:
        school.custom_domain = domain


def create_school_admin(db: Session, school: School, body: dict) -> User:
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or SCHOOL_ADMIN).strip().lower()
    if role not in {SCHOOL_ADMIN, EDITOR, PRINCIPAL}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Role must be school_admin, principal, or editor")
    if not email or "@" not in email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A valid email is required")
    if len(password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 8 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That email is already in use")
    user = User(
        school_id=school.id,
        name=body.get("name") or f"{school.name} Administrator",
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_platform_user(db: Session, user_id: str, body: dict, actor: User) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if user.id == actor.id and body.get("isActive") is False:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate your own account")
    if "name" in body and body["name"]:
        user.name = str(body["name"]).strip()
    if "isActive" in body:
        user.is_active = bool(body["isActive"])
    if "role" in body:
        role = str(body["role"]).strip().lower()
        if user.role == SUPER_ADMIN and role != SUPER_ADMIN:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Platform owners cannot be demoted here")
        if role == SUPER_ADMIN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot assign super_admin this way")
        if role not in {SCHOOL_ADMIN, EDITOR, PRINCIPAL}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown role")
        if not user.school_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Platform users cannot be given a school role")
        user.role = role
    db.commit()
    db.refresh(user)
    return user


def platform_stats(db: Session) -> dict:
    schools = db.query(School).all()
    by_status = {key: 0 for key in SCHOOL_STATUSES}
    for school in schools:
        by_status[school.status] = by_status.get(school.status, 0) + 1
    storage = sum(storage_bytes_for(db, school.id) for school in schools)
    return {
        "schools": len(schools),
        "schoolsByStatus": by_status,
        "users": db.query(User).count(),
        "schoolAdmins": db.query(User).filter(User.role == SCHOOL_ADMIN).count(),
        "news": db.query(NewsArticle).count(),
        "events": db.query(Event).count(),
        "media": db.query(MediaAsset).count(),
        "storageBytes": storage,
        "activeSchools": by_status.get("active", 0) + by_status.get("trial", 0),
    }


def list_all_domains(db: Session) -> list[dict]:
    rows = db.query(SchoolDomain).all()
    schools = {school.id: school for school in db.query(School).all()}
    payload = []
    for row in rows:
        school = schools.get(row.school_id)
        payload.append({
            **serialize_domain(row),
            "schoolName": school.name if school else None,
            "schoolSlug": school.slug if school else None,
            "schoolStatus": school.status if school else None,
        })
    return sorted(payload, key=lambda item: (item["schoolName"] or "", item["domain"]))
