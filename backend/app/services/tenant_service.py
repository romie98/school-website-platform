from urllib.parse import urlparse

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.school import School, SchoolDomain


INACTIVE_STATUSES = {"suspended", "archived"}


class TenantResolutionError(Exception):
    def __init__(self, message: str, status_code: int = 404):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _normalize_host(hostname: str) -> str:
    value = (hostname or "").strip().lower()
    if "://" in value:
        value = urlparse(value).hostname or value
    if ":" in value:
        value = value.split(":")[0]
    if value.startswith("www."):
        value = value[4:]
    return value


def resolve_tenant(
    db: Session,
    *,
    hostname: str | None = None,
    slug: str | None = None,
    allow_dev_override: bool = False,
) -> School:
    settings = get_settings()
    host = _normalize_host(hostname or "")

    school: School | None = None
    if slug and (allow_dev_override or settings.is_development):
        school = db.scalar(select(School).where(School.slug == slug))
    if school is None and host:
        school = db.scalar(
            select(School).where(or_(School.custom_domain == host, School.domain == host))
        )
    if school is None and host:
        domain = db.scalar(select(SchoolDomain).where(SchoolDomain.domain == host))
        if domain:
            school = db.get(School, domain.school_id)
    if school is None and host and settings.platform_domain:
        platform = settings.platform_domain.lower()
        if host.endswith("." + platform):
            extracted = host[: -(len(platform) + 1)]
            school = db.scalar(select(School).where(School.slug == extracted))
    if school is None and host in {"localhost", "127.0.0.1"}:
        school = db.scalar(select(School).where(School.slug == settings.default_tenant_slug))
    if school is None:
        raise TenantResolutionError("Unknown domain")
    return school


def assert_school_public(school: School) -> None:
    if school.status == "suspended":
        raise TenantResolutionError("This school website is temporarily unavailable", 503)
    if school.status == "archived":
        raise TenantResolutionError("Unknown domain", 404)
