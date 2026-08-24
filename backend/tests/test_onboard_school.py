from __future__ import annotations

from io import StringIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  — register metadata
from app.core.security import verify_password
from app.db.base import Base
from app.models.content import HomepageSection, NewsArticle, Page, SiteBundle, StaffMember
from app.models.school import School, SchoolDomain, SchoolSettings
from app.models.user import PRINCIPAL, SCHOOL_ADMIN, SUPER_ADMIN, User
from app.services.onboard_service import (
    OnboardError,
    OnboardSpec,
    format_summary,
    onboard_school,
    require_production_confirmation,
)
from app.util.jsonutil import loads
from scripts.onboard_school import run as run_cli


DEMO_SLUGS = {"manchester-high", "demo-academy", "christiana-high-school"}
DEMO_EMAILS = {
    "admin@manchesterhigh.edu.jm",
    "admin@demoacademy.edu.jm",
    "platform@schoolplatform.com",
    "principal@manchesterhigh.edu.jm",
    "principal@demoacademy.edu.jm",
}


def belair_spec(**overrides) -> OnboardSpec:
    data = dict(
        name="Bel-Air High School",
        slug="belair-high",
        domain="belair.schoolplatform.com",
        admin_email="admin@belairhighschoolja.com",
        admin_name="Bel-Air Administrator",
        principal_email="principal@belairhighschoolja.com",
        principal_name="Principal",
    )
    data.update(overrides)
    return OnboardSpec(**data)


@pytest.fixture
def onboard_db(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.onboard_service.school_prefix", lambda *args, **kwargs: Path(tmp_path))
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def commit_onboard(db, spec: OnboardSpec):
    try:
        result = onboard_school(db, spec)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


def test_creates_exactly_one_requested_school(onboard_db):
    result = commit_onboard(onboard_db, belair_spec())
    schools = onboard_db.query(School).all()
    assert len(schools) == 1
    assert schools[0].slug == "belair-high"
    assert schools[0].name == "Bel-Air High School"
    assert schools[0].status == "active"
    assert schools[0].subscription_status == "active"
    assert result.school.id == schools[0].id
    slugs = {row.slug for row in schools}
    assert slugs.isdisjoint(DEMO_SLUGS)


def test_no_demo_tenants_or_platform_owner(onboard_db):
    commit_onboard(onboard_db, belair_spec())
    slugs = {row.slug for row in onboard_db.query(School).all()}
    assert slugs == {"belair-high"}
    emails = {row.email for row in onboard_db.query(User).all()}
    assert emails.isdisjoint(DEMO_EMAILS)
    assert onboard_db.query(User).filter(User.role == SUPER_ADMIN).count() == 0
    assert onboard_db.query(NewsArticle).count() == 0
    assert onboard_db.query(StaffMember).count() == 0


def test_creates_settings(onboard_db):
    result = commit_onboard(onboard_db, belair_spec(motto=""))
    settings = onboard_db.query(SchoolSettings).filter(SchoolSettings.school_id == result.school.id).one()
    assert settings.school_name == "Bel-Air High School"
    assert settings.theme == "classic"
    assert settings.heading_font
    assert settings.body_font
    assert settings.hero_style
    assert settings.navbar_style
    assert settings.news_layout
    assert settings.events_layout
    assert settings.footer_style
    contact = loads(settings.contact_json)
    branding = loads(settings.branding_json)
    assert contact["schoolName"] == "Bel-Air High School"
    assert branding["schoolName"] == "Bel-Air High School"
    assert "Sic Luceat Lux" not in (settings.motto or "")


def test_creates_platform_domain(onboard_db):
    result = commit_onboard(onboard_db, belair_spec())
    rows = onboard_db.query(SchoolDomain).filter(SchoolDomain.school_id == result.school.id).all()
    hosts = {row.domain: row for row in rows}
    assert "belair.schoolplatform.com" in hosts
    assert hosts["belair.schoolplatform.com"].verified is True
    assert result.school.domain == "belair.schoolplatform.com"


def test_custom_domain_is_not_auto_verified(onboard_db):
    result = commit_onboard(onboard_db, belair_spec(custom_domain="belairhighschoolja.com"))
    row = onboard_db.query(SchoolDomain).filter(SchoolDomain.domain == "belairhighschoolja.com").one()
    assert row.school_id == result.school.id
    assert row.verified is False
    assert result.school.custom_domain == "belairhighschoolja.com"


def test_duplicate_domain_rejected(onboard_db):
    commit_onboard(onboard_db, belair_spec())
    with pytest.raises(OnboardError, match="already assigned"):
        commit_onboard(
            onboard_db,
            OnboardSpec(
                name="Other High",
                slug="other-high",
                domain="belair.schoolplatform.com",
                admin_email="admin@otherhigh.edu.jm",
            ),
        )
    assert onboard_db.query(School).count() == 1
    assert onboard_db.query(School).filter(School.slug == "other-high").count() == 0


def test_admin_gets_school_admin_role(onboard_db):
    commit_onboard(onboard_db, belair_spec())
    admin = onboard_db.query(User).filter(User.email == "admin@belairhighschoolja.com").one()
    assert admin.role == SCHOOL_ADMIN
    assert admin.school_id is not None
    assert admin.is_active is True


def test_principal_gets_principal_role(onboard_db):
    result = commit_onboard(onboard_db, belair_spec())
    principal = onboard_db.query(User).filter(User.email == "principal@belairhighschoolja.com").one()
    assert principal.role == PRINCIPAL
    assert principal.school_id == result.school.id


def test_generated_passwords_verify(onboard_db):
    result = commit_onboard(onboard_db, belair_spec())
    assert result.admin_password
    assert result.principal_password
    admin = onboard_db.query(User).filter(User.email == result.admin_email).one()
    principal = onboard_db.query(User).filter(User.email == result.principal_email).one()
    assert verify_password(result.admin_password, admin.password_hash)
    assert verify_password(result.principal_password, principal.password_hash)
    assert result.admin_password != result.principal_password
    summary = format_summary(result)
    assert result.admin_password in summary
    assert admin.password_hash not in summary
    assert "DATABASE_URL" not in summary
    assert "SECRET_KEY" not in summary


def test_rerun_is_idempotent(onboard_db):
    first = commit_onboard(onboard_db, belair_spec(template="basic"))
    section_count = onboard_db.query(HomepageSection).filter(HomepageSection.school_id == first.school.id).count()
    domain_count = onboard_db.query(SchoolDomain).count()
    user_count = onboard_db.query(User).count()
    second = commit_onboard(onboard_db, belair_spec(template="basic"))
    assert second.school.id == first.school.id
    assert onboard_db.query(School).count() == 1
    assert onboard_db.query(HomepageSection).filter(HomepageSection.school_id == first.school.id).count() == section_count
    assert onboard_db.query(SchoolDomain).count() == domain_count
    assert onboard_db.query(User).count() == user_count
    assert onboard_db.query(SiteBundle).filter(SiteBundle.school_id == first.school.id).count() == 1


def test_rerun_does_not_reset_existing_password(onboard_db):
    first = commit_onboard(onboard_db, belair_spec())
    admin = onboard_db.query(User).filter(User.email == first.admin_email).one()
    original_hash = admin.password_hash
    second = commit_onboard(onboard_db, belair_spec())
    onboard_db.refresh(admin)
    assert admin.password_hash == original_hash
    assert second.admin_created is False
    assert second.admin_password is None
    assert verify_password(first.admin_password, admin.password_hash)


def test_template_creates_sections_and_navigation_once(onboard_db):
    first = commit_onboard(onboard_db, belair_spec(template="basic"))
    sections = onboard_db.query(HomepageSection).filter(HomepageSection.school_id == first.school.id).all()
    types = [row.section_type for row in sections]
    assert types[0] == "hero"
    assert "news" in types
    assert "principal" in types
    bundle = onboard_db.query(SiteBundle).filter(SiteBundle.school_id == first.school.id).one()
    payload = loads(bundle.payload)
    assert payload["navigation"][0]["href"] == "/"
    assert payload["homepage"]["heroTitle"] == "Bel-Air High School"
    assert payload["principal"]["content"] == ""
    assert payload["about"]["overview"] == []
    assert payload["admissions"]["requirements"] == []
    assert onboard_db.query(Page).filter(Page.school_id == first.school.id, Page.slug == "about").count() == 1
    commit_onboard(onboard_db, belair_spec(template="basic"))
    assert onboard_db.query(HomepageSection).filter(HomepageSection.school_id == first.school.id).count() == len(sections)
    later = loads(onboard_db.query(SiteBundle).filter(SiteBundle.school_id == first.school.id).one().payload)
    later["navigation"].append({"label": "Edited", "href": "/edited"})
    bundle = onboard_db.query(SiteBundle).filter(SiteBundle.school_id == first.school.id).one()
    bundle.payload = '{"navigation": [{"label": "Edited", "href": "/edited"}], "homepage": {"heroTitle": "Keep me"}}'
    onboard_db.commit()
    commit_onboard(onboard_db, belair_spec(template="basic"))
    kept = loads(onboard_db.query(SiteBundle).filter(SiteBundle.school_id == first.school.id).one().payload)
    assert kept["homepage"]["heroTitle"] == "Keep me"
    assert kept["navigation"][0]["label"] == "Edited"


def test_empty_mode_has_no_demo_news(onboard_db):
    result = commit_onboard(onboard_db, belair_spec())
    bundle = onboard_db.query(SiteBundle).filter(SiteBundle.school_id == result.school.id).one()
    payload = loads(bundle.payload)
    assert payload["navigation"]
    assert "news" not in payload or payload.get("news") in (None, [])
    assert onboard_db.query(NewsArticle).count() == 0


def test_tenant_paths_are_school_scoped(onboard_db):
    first = commit_onboard(onboard_db, belair_spec())
    second = commit_onboard(
        onboard_db,
        OnboardSpec(
            name="Harbor School",
            slug="harbor-school",
            admin_email="admin@harborschool.edu.jm",
        ),
    )
    assert first.school.id != second.school.id
    assert onboard_db.query(School).count() == 2
    harbor_admin = onboard_db.query(User).filter(User.email == "admin@harborschool.edu.jm").one()
    assert harbor_admin.school_id == second.school.id
    belair_admin = onboard_db.query(User).filter(User.email == "admin@belairhighschoolja.com").one()
    assert belair_admin.school_id == first.school.id


def test_transaction_rolls_back_on_failure(onboard_db, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("injected failure")

    monkeypatch.setattr("app.services.onboard_service._ensure_user", boom)
    with pytest.raises(RuntimeError, match="injected failure"):
        commit_onboard(onboard_db, belair_spec())
    assert onboard_db.query(School).count() == 0
    assert onboard_db.query(SchoolSettings).count() == 0
    assert onboard_db.query(SchoolDomain).count() == 0
    assert onboard_db.query(User).count() == 0


def test_production_confirmation_guard_requires_slug(capsys):
    output = StringIO()
    with pytest.raises(OnboardError, match="cancelled"):
        require_production_confirmation(
            "production",
            school_name="Bel-Air High School",
            slug="belair-high",
            yes=False,
            confirm=lambda _: "nope",
            output=output,
        )
    text = output.getvalue()
    assert "production" in text.lower()
    assert "Bel-Air High School" in text
    assert "belair-high" in text
    assert "DATABASE_URL" not in text


def test_production_confirmation_guard_accepts_yes():
    require_production_confirmation(
        "production",
        school_name="Bel-Air High School",
        slug="belair-high",
        yes=True,
        confirm=lambda _: "should-not-run",
        output=StringIO(),
    )


def test_production_guard_skipped_outside_production():
    require_production_confirmation(
        "test",
        school_name="Bel-Air High School",
        slug="belair-high",
        yes=False,
        confirm=lambda _: (_ for _ in ()).throw(AssertionError("should not prompt")),
        output=StringIO(),
    )


def test_cli_production_guard_aborts_before_write(onboard_db, monkeypatch):
    monkeypatch.setattr(
        "scripts.onboard_school.get_settings",
        lambda: SimpleNamespace(environment="production", is_production=True, platform_domain="schoolplatform.com"),
    )
    code = run_cli(onboard_db, belair_spec(), yes=False, confirm=lambda _: "wrong", output=StringIO())
    assert code == 1
    assert onboard_db.query(School).count() == 0


def test_cli_rejects_password_argument():
    from scripts.onboard_school import build_parser

    with pytest.raises(SystemExit):
        build_parser().parse_args(
            [
                "--name",
                "Bel-Air High School",
                "--slug",
                "belair-high",
                "--admin-email",
                "admin@belairhighschoolja.com",
                "--admin-password",
                "secret",
            ]
        )
