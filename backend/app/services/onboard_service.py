"""Production-safe onboarding of a single school tenant.

Does not call app.seed and does not create demo/test fixtures.
"""

from __future__ import annotations

import re
import secrets
import string
from dataclasses import dataclass, field
from typing import Callable, TextIO

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.content import HomepageSection, Page, SiteBundle
from app.models.school import School, SchoolDomain, SchoolSettings, SubscriptionPlan
from app.models.user import PRINCIPAL, SCHOOL_ADMIN, User, new_id
from app.services.feature_service import DEFAULT_FEATURES
from app.services.media_service import school_prefix
from app.services.platform_service import (
    SCHOOL_STATUSES,
    SLUG_RE,
    SUBSCRIPTION_STATUSES,
    domain_conflict,
    ensure_default_plans,
    normalize_domain,
    platform_subdomain,
)
from app.services.site_service import DEFAULT_NAV
from app.services.theme_service import ALLOWED_THEMES, THEME_PRESETS, apply_preset_defaults, coerce_theme
from app.util.jsonutil import dumps, loads

COLOR_RE = re.compile(r"^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")
EMPTY_SECTIONS = [
    ("hero", "full-image"),
    ("welcome", "default"),
    ("news", "featured"),
    ("events", "cards"),
    ("cta", "default"),
]
BASIC_SECTIONS = [
    ("hero", "full-image"),
    ("welcome", "default"),
    ("principal", "default"),
    ("news", "featured"),
    ("events", "cards"),
    ("cta", "default"),
]


class OnboardError(Exception):
    """User-facing onboarding failure. Safe to print; never includes secrets."""


@dataclass
class OnboardSpec:
    name: str
    slug: str
    admin_email: str
    admin_name: str = ""
    principal_email: str = ""
    principal_name: str = ""
    domain: str = ""
    custom_domain: str = ""
    verify_custom_domain: bool = False
    template: str = ""
    theme: str = "classic"
    primary_color: str = ""
    secondary_color: str = ""
    accent_color: str = ""
    motto: str = ""
    short_name: str = ""
    status: str = "active"
    subscription_status: str = "active"
    import_source: str | None = None


@dataclass
class OnboardResult:
    school: School
    school_created: bool
    admin_created: bool
    principal_created: bool
    admin_email: str
    principal_email: str | None
    admin_password: str | None
    principal_password: str | None
    platform_domain: str
    custom_domain: str | None
    notes: list[str] = field(default_factory=list)


def generate_temporary_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
        ):
            return password


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def validate_email(value: str, *, label: str) -> str:
    email = normalize_email(value)
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise OnboardError(f"A valid {label} is required")
    return email


def validate_slug(value: str) -> str:
    slug = (value or "").strip().lower()
    if not SLUG_RE.match(slug):
        raise OnboardError("Slug must be lowercase letters, numbers, and hyphens")
    return slug


def validate_color(value: str, fallback: str) -> str:
    raw = (value or "").strip() or fallback
    if not COLOR_RE.match(raw):
        raise OnboardError(f"Invalid colour: {raw}")
    return raw


def validate_spec(spec: OnboardSpec) -> OnboardSpec:
    name = (spec.name or "").strip()
    if not name:
        raise OnboardError("School name is required")
    slug = validate_slug(spec.slug)
    theme = (spec.theme or "classic").strip().lower() or "classic"
    if theme not in ALLOWED_THEMES:
        raise OnboardError("Unknown theme")
    status = (spec.status or "active").strip().lower()
    if status not in SCHOOL_STATUSES:
        raise OnboardError("Unknown school status")
    subscription_status = (spec.subscription_status or "active").strip().lower()
    if subscription_status not in SUBSCRIPTION_STATUSES:
        raise OnboardError("Unknown subscription status")
    template = (spec.template or "").strip().lower()
    if template in {"", "empty", "none"}:
        template = ""
    elif template != "basic":
        raise OnboardError("Unknown template. Use empty (default) or basic")
    spec.name = name
    spec.slug = slug
    spec.theme = theme
    spec.status = status
    spec.subscription_status = subscription_status
    spec.template = template
    spec.admin_email = validate_email(spec.admin_email, label="admin email")
    spec.admin_name = (spec.admin_name or "").strip() or f"{name} Administrator"
    spec.principal_email = normalize_email(spec.principal_email)
    if spec.principal_email:
        spec.principal_email = validate_email(spec.principal_email, label="principal email")
    spec.principal_name = (spec.principal_name or "").strip() or "Principal"
    spec.short_name = (spec.short_name or "").strip() or name
    spec.motto = (spec.motto or "").strip()
    spec.domain = normalize_domain(spec.domain) if spec.domain else ""
    spec.custom_domain = normalize_domain(spec.custom_domain) if spec.custom_domain else ""
    return spec


def is_platform_host(host: str, slug: str, platform_domain: str) -> bool:
    generated = f"{slug}.{platform_domain}".lower()
    host = host.lower()
    root = platform_domain.lower()
    return host == generated or host.endswith(f".{root}")


def require_production_confirmation(
    environment: str,
    *,
    school_name: str,
    slug: str,
    yes: bool,
    confirm: Callable[[str], str] | None = None,
    output: TextIO | None = None,
) -> None:
    env = (environment or "").strip().lower()
    if env not in {"production", "prod"}:
        return
    stream = output
    message = (
        "Production onboarding\n"
        f"Environment: {environment}\n"
        f"School: {school_name}\n"
        f"Slug: {slug}\n"
    )
    if stream is not None:
        stream.write(message)
        if not yes:
            stream.write("Re-run with --yes after reviewing the target, or type the slug to confirm.\n")
    if yes:
        return
    prompt = confirm or input
    answer = prompt("Type the school slug to confirm production onboarding: ")
    if (answer or "").strip() != slug:
        raise OnboardError("Production onboarding cancelled")


def _professional_plan(db: Session) -> SubscriptionPlan | None:
    ensure_default_plans(db)
    return (
        db.get(SubscriptionPlan, "plan-professional")
        or db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == "professional").first()
    )


def _ensure_school(db: Session, spec: OnboardSpec, platform_host: str) -> tuple[School, bool]:
    existing = db.query(School).filter(School.slug == spec.slug).first()
    if existing:
        return existing, False
    preset = THEME_PRESETS[spec.theme]
    primary = validate_color(spec.primary_color, preset.get("primaryColor") or "#0B3D2E")
    secondary = validate_color(spec.secondary_color, preset.get("secondaryColor") or "#FFD100")
    accent = validate_color(spec.accent_color, preset.get("accentColor") or "#145C45")
    plan = _professional_plan(db)
    school = School(
        id=new_id(),
        name=spec.name,
        slug=spec.slug,
        domain=platform_host,
        custom_domain=spec.custom_domain or None,
        primary_color=primary,
        secondary_color=secondary,
        accent_color=accent,
        theme=spec.theme,
        status=spec.status,
        subscription_plan_id=plan.id if plan else None,
        subscription_status=spec.subscription_status,
        feature_flags=dumps(dict(DEFAULT_FEATURES)),
    )
    db.add(school)
    db.flush()
    return school, True


def _ensure_settings(db: Session, school: School, spec: OnboardSpec) -> SchoolSettings:
    settings = school.settings or db.query(SchoolSettings).filter(SchoolSettings.school_id == school.id).first()
    if settings:
        return settings
    preset = THEME_PRESETS[coerce_theme(school.theme)]
    settings = SchoolSettings(
        school_id=school.id,
        school_name=school.name,
        short_name=spec.short_name,
        motto=spec.motto or None,
        primary_color=school.primary_color,
        secondary_color=school.secondary_color,
        accent_color=school.accent_color,
        heading_font=preset["headingFont"],
        body_font=preset["bodyFont"],
        theme=school.theme,
        hero_style=preset["heroStyle"],
        navbar_style=preset["navbarStyle"],
        news_layout=preset["newsLayout"],
        events_layout=preset["eventsLayout"],
        footer_style=preset["footerStyle"],
        contact_json=dumps(
            {
                "schoolName": school.name,
                "addressLines": [],
                "phone": [],
                "email": [],
                "admissionsEmail": "",
                "generalEmail": "",
                "officeHours": "",
                "mapEmbedUrl": "",
                "social": [],
            }
        ),
        branding_json=dumps(
            {
                "schoolName": school.name,
                "motto": spec.motto or "",
                "primaryColor": school.primary_color,
                "secondaryColor": school.secondary_color,
                "accentColor": school.accent_color,
            }
        ),
    )
    apply_preset_defaults(settings, school.theme)
    db.add(settings)
    db.flush()
    return settings


def _assert_host_available(db: Session, host: str, *, exclude_school_id: str | None = None) -> None:
    if not host:
        return
    domain_row = db.query(SchoolDomain).filter(SchoolDomain.domain == host).first()
    if domain_row and domain_row.school_id != exclude_school_id:
        raise OnboardError("That domain is already assigned")
    school_row = db.query(School).filter((School.domain == host) | (School.custom_domain == host)).first()
    if school_row and school_row.id != exclude_school_id:
        raise OnboardError("That domain is already assigned")


def _ensure_domain(db: Session, school: School, host: str, *, is_primary: bool, verified: bool) -> None:
    if not host:
        return
    existing = db.query(SchoolDomain).filter(SchoolDomain.domain == host).first()
    if existing:
        if existing.school_id != school.id:
            raise OnboardError("That domain is already assigned")
        return
    if domain_conflict(db, host, exclude_school_id=school.id):
        raise OnboardError("That domain is already assigned")
    db.add(
        SchoolDomain(
            school_id=school.id,
            domain=host,
            is_primary=is_primary,
            verified=verified,
        )
    )


def _ensure_user(
    db: Session,
    school: School,
    *,
    email: str,
    name: str,
    role: str,
) -> tuple[User | None, str | None, bool, str | None]:
    """Return (user, password_if_created, created, skip_note)."""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.school_id and existing.school_id != school.id:
            raise OnboardError(f"Email {email} already belongs to another school")
        if existing.school_id is None:
            raise OnboardError(f"Email {email} already exists as a platform account")
        return existing, None, False, f"{email} already exists; password was not changed"
    password = generate_temporary_password()
    user = User(
        school_id=school.id,
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user, password, True, None


def _ensure_sections(db: Session, school: School, spec: OnboardSpec, settings: SchoolSettings) -> None:
    if db.query(HomepageSection).filter(HomepageSection.school_id == school.id).first():
        return
    preset = THEME_PRESETS[coerce_theme(settings.theme or school.theme)]
    catalog = BASIC_SECTIONS if spec.template == "basic" else EMPTY_SECTIONS
    mapped: list[tuple[str, str]] = []
    for section_type, variant in catalog:
        if section_type == "hero":
            mapped.append((section_type, settings.hero_style or preset["heroStyle"]))
        elif section_type == "news":
            mapped.append((section_type, settings.news_layout or preset["newsLayout"]))
        elif section_type == "events":
            mapped.append((section_type, settings.events_layout or preset["eventsLayout"]))
        else:
            mapped.append((section_type, variant))
    for index, (section_type, variant) in enumerate(mapped):
        db.add(
            HomepageSection(
                school_id=school.id,
                section_type=section_type,
                variant=variant,
                position=index,
                enabled=True,
            )
        )


def _empty_homepage(school: School, settings: SchoolSettings) -> dict:
    return {
        "heroEyebrow": settings.short_name or school.name,
        "heroTitle": school.name,
        "heroTagline": "",
        "heroImage": "",
        "primaryButtonLabel": "Explore Our School",
        "primaryButtonUrl": "/about",
        "secondaryButtonLabel": "Admissions",
        "secondaryButtonUrl": "/admissions",
        "welcomeTitle": f"Welcome to {school.name}",
        "welcomeBody": [],
        "welcomeImage": "",
        "welcomeButtonLabel": "Learn More About Us",
        "welcomeButtonUrl": "/about",
        "sections": [],
    }


def _empty_principal() -> dict:
    return {
        "name": "",
        "title": "Principal",
        "photo": "",
        "excerpt": "",
        "messageTitle": "Welcome",
        "content": "",
        "paragraphs": [],
        "signature": "",
    }


def _empty_about(school: School, settings: SchoolSettings) -> dict:
    return {
        "overview": [],
        "history": [],
        "mission": "",
        "vision": "",
        "motto": settings.motto or "",
        "crestExplanation": [],
        "achievements": [],
        "campus": [],
    }


def _empty_admissions() -> dict:
    return {
        "intro": [],
        "requirements": [],
        "process": [],
        "documents": [],
        "transfers": [],
        "deadlines": [],
        "faqs": [],
    }


def apply_template(db: Session, school: School, settings: SchoolSettings, spec: OnboardSpec) -> None:
    bundle = db.query(SiteBundle).filter(SiteBundle.school_id == school.id).first()
    payload = loads(bundle.payload) if bundle else {}
    created_bundle = bundle is None
    if "navigation" not in payload or payload.get("navigation") in (None, []):
        payload["navigation"] = [dict(item) for item in DEFAULT_NAV]
    if spec.template == "basic":
        payload.setdefault("homepage", _empty_homepage(school, settings))
        payload.setdefault("principal", _empty_principal())
        payload.setdefault("about", _empty_about(school, settings))
        payload.setdefault("admissions", _empty_admissions())
        payload.setdefault("statistics", [])
        payload.setdefault("quickLinks", [])
        _ensure_page(db, school, "about", "About", payload["about"])
        _ensure_page(db, school, "admissions", "Admissions", payload["admissions"])
    if created_bundle:
        db.add(SiteBundle(school_id=school.id, payload=dumps(payload)))
    else:
        bundle.payload = dumps(payload)


def _ensure_page(db: Session, school: School, slug: str, title: str, body: dict) -> None:
    existing = db.query(Page).filter(Page.school_id == school.id, Page.slug == slug).first()
    if existing:
        return
    db.add(Page(school_id=school.id, slug=slug, title=title, body=dumps(body), status="published"))


def import_school_content(db: Session, school: School, source: str | None) -> None:
    """Hook for later JSON/CSV/legacy-site importers. Never loads demo fixtures."""
    if not source:
        return
    raise OnboardError(f"Unknown content importer: {source}")


def onboard_school(db: Session, spec: OnboardSpec, *, platform_domain: str | None = None) -> OnboardResult:
    spec = validate_spec(spec)
    notes: list[str] = []
    root_domain = (platform_domain or get_settings().platform_domain).strip().lower()
    generated_host = f"{spec.slug}.{root_domain}"
    platform_host = spec.domain or generated_host
    platform_verified = is_platform_host(platform_host, spec.slug, root_domain)

    if spec.custom_domain and spec.custom_domain == platform_host:
        raise OnboardError("Custom domain must be different from the platform domain")

    existing = db.query(School).filter(School.slug == spec.slug).first()
    _assert_host_available(db, platform_host, exclude_school_id=existing.id if existing else None)
    _assert_host_available(db, spec.custom_domain, exclude_school_id=existing.id if existing else None)

    school, school_created = _ensure_school(db, spec, platform_host)
    settings = _ensure_settings(db, school, spec)

    primary_is_custom = bool(spec.custom_domain)
    _ensure_domain(
        db,
        school,
        platform_host,
        is_primary=not primary_is_custom and not school.custom_domain,
        verified=platform_verified,
    )
    if spec.custom_domain:
        _ensure_domain(
            db,
            school,
            spec.custom_domain,
            is_primary=True,
            verified=spec.verify_custom_domain,
        )
        if school.custom_domain is None:
            school.custom_domain = spec.custom_domain

    admin, admin_password, admin_created, admin_note = _ensure_user(
        db,
        school,
        email=spec.admin_email,
        name=spec.admin_name,
        role=SCHOOL_ADMIN,
    )
    if admin_note:
        notes.append(admin_note)
    if admin and admin.role != SCHOOL_ADMIN and not admin_created:
        notes.append(f"{spec.admin_email} already exists with role {admin.role}; role was not changed")

    principal_password = None
    principal_created = False
    principal_email = spec.principal_email or None
    if spec.principal_email:
        _principal, principal_password, principal_created, principal_note = _ensure_user(
            db,
            school,
            email=spec.principal_email,
            name=spec.principal_name,
            role=PRINCIPAL,
        )
        if principal_note:
            notes.append(principal_note)

    _ensure_sections(db, school, spec, settings)
    apply_template(db, school, settings, spec)
    import_school_content(db, school, spec.import_source)
    school_prefix(school.id, "uploads")
    db.flush()

    return OnboardResult(
        school=school,
        school_created=school_created,
        admin_created=admin_created,
        principal_created=principal_created,
        admin_email=spec.admin_email,
        principal_email=principal_email,
        admin_password=admin_password,
        principal_password=principal_password,
        platform_domain=school.domain or platform_host,
        custom_domain=school.custom_domain,
        notes=notes,
    )


def format_summary(result: OnboardResult) -> str:
    lines = [
        "School created:" if result.school_created else "School already existed:",
        result.school.name,
        "",
        "Slug:",
        result.school.slug,
        "",
        "School ID:",
        result.school.id,
        "",
        "Platform domain:",
        result.platform_domain or "—",
    ]
    if result.custom_domain:
        lines.extend(["", "Custom domain:", result.custom_domain])
    lines.extend(["", "Admin:", result.admin_email])
    if result.admin_password:
        lines.extend(["Temporary password:", result.admin_password])
    else:
        lines.append("Account already exists; password was not changed.")
    if result.principal_email:
        lines.extend(["", "Principal:", result.principal_email])
        if result.principal_password:
            lines.extend(["Temporary password:", result.principal_password])
        else:
            lines.append("Account already exists; password was not changed.")
    if result.notes:
        lines.extend(["", "Notes:"])
        lines.extend(f"- {note}" for note in result.notes)
    lines.extend(
        [
            "",
            "IMPORTANT:",
            "These temporary passwords are shown once. Change them after first login.",
        ]
    )
    return "\n".join(lines) + "\n"
