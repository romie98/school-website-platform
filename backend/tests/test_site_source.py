from pathlib import Path

from app.models.content import Event, NewsArticle, StaffMember
from app.models.user import User
from app.seed import BELAIR, MANCHESTER, seed
from app.seed_belair import ensure_belair

ROOT = Path(__file__).resolve().parents[2]


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def belair_admin(client):
    return login(client, "admin@belairhighschoolja.com", "belair1968")


def belair_principal(client):
    return login(client, "principal@belairhighschoolja.com", "belair1968")


def titles(payload):
    return [item["title"] for item in payload["content"]["news"]]


def test_published_article_visible_to_admin_and_public(client, db):
    admin = belair_admin(client)
    article = NewsArticle(
        id="n-shared-live",
        school_id=BELAIR,
        slug="shared-live-article",
        title="Shared live article",
        excerpt="Same record on both APIs.",
        content="<p>Database-backed story.</p>",
        category="General",
        author="Communications",
        date="2026-08-20",
        status="published",
    )
    db.add(article)
    db.commit()

    admin_site = client.get("/api/admin/site", headers=admin).json()
    public_site = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert "Shared live article" in titles(admin_site)
    assert "Shared live article" in titles(public_site)
    admin_ids = {item["id"] for item in admin_site["content"]["news"]}
    public_ids = {item["id"] for item in public_site["content"]["news"]}
    assert "n-shared-live" in admin_ids
    assert "n-shared-live" in public_ids


def test_draft_article_visible_to_admin_not_public(client, db):
    admin = belair_admin(client)
    db.add(NewsArticle(
        id="n-draft-only",
        school_id=BELAIR,
        slug="draft-only-article",
        title="Draft only article",
        excerpt="Not for the public site.",
        content="<p>Draft.</p>",
        category="General",
        author="Communications",
        date="2026-08-20",
        status="draft",
    ))
    db.commit()

    admin_site = client.get("/api/admin/site", headers=admin).json()
    public_site = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert "Draft only article" in titles(admin_site)
    assert "Draft only article" not in titles(public_site)


def test_public_keeps_old_content_until_principal_approves(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=principal, json={
        "title": "Original published title",
        "slug": "approval-publication-flow",
        "content": "<p>Original published title</p>",
        "status": "published",
    })
    assert created.status_code == 200, created.text
    article_id = created.json()["record"]["id"]

    public_before = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert "Original published title" in titles(public_before)
    assert "Updated after approval" not in titles(public_before)

    pending = client.put(f"/api/admin/news/{article_id}", headers=admin, json={
        "title": "Updated after approval",
        "slug": "approval-publication-flow",
        "content": "<p>Updated after approval</p>",
        "status": "published",
    }).json()
    assert pending["mode"] == "pending"

    public_pending = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert "Original published title" in titles(public_pending)
    assert "Updated after approval" not in titles(public_pending)

    change_id = pending["change"]["id"]
    approved = client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert approved.status_code == 200, approved.text

    public_after = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert "Updated after approval" in titles(public_after)
    assert "Original published title" not in titles(public_after)


def test_declined_edit_does_not_change_public_content(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=principal, json={
        "title": "Keep this public title",
        "slug": "decline-protection-flow",
        "content": "<p>Keep this public title</p>",
        "status": "published",
    }).json()
    article_id = created["record"]["id"]
    pending = client.put(f"/api/admin/news/{article_id}", headers=admin, json={
        "title": "Must not appear publicly",
        "slug": "decline-protection-flow",
        "status": "published",
    }).json()
    client.post(
        f"/api/admin/changes/{pending['change']['id']}/decline",
        headers=principal,
        json={"reason": "Keep the original wording."},
    )
    public = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert "Keep this public title" in titles(public)
    assert "Must not appear publicly" not in titles(public)
    live = db.get(NewsArticle, article_id)
    assert live.title == "Keep this public title"


def test_belair_content_not_visible_on_manchester(client, db):
    db.add(NewsArticle(
        id="n-belair-private-isolation",
        school_id=BELAIR,
        slug="belair-private-isolation",
        title="Bel-Air only isolation story",
        excerpt="Must not leak.",
        content="<p>Bel-Air only.</p>",
        category="General",
        author="Communications",
        date="2026-08-20",
        status="published",
    ))
    db.commit()
    belair = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    manchester = client.get("/api/public/site", headers={"Host": "manchesterhigh.edu.jm"}).json()
    assert "Bel-Air only isolation story" in titles(belair)
    assert "Bel-Air only isolation story" not in titles(manchester)
    assert belair["school"]["id"] == BELAIR
    assert manchester["school"]["id"] == MANCHESTER


def test_seed_is_idempotent(db):
    news_before = db.query(NewsArticle).filter(NewsArticle.school_id == BELAIR).count()
    events_before = db.query(Event).filter(Event.school_id == BELAIR).count()
    staff_before = db.query(StaffMember).filter(StaffMember.school_id == BELAIR).count()
    users_before = db.query(User).filter(User.school_id == BELAIR).count()
    seed(db)
    ensure_belair(db)
    db.commit()
    assert db.query(NewsArticle).filter(NewsArticle.school_id == BELAIR).count() == news_before
    assert db.query(Event).filter(Event.school_id == BELAIR).count() == events_before
    assert db.query(StaffMember).filter(StaffMember.school_id == BELAIR).count() == staff_before
    assert db.query(User).filter(User.school_id == BELAIR).count() == users_before


def test_seed_does_not_overwrite_edited_article(db):
    row = db.get(NewsArticle, "n-belair-2")
    assert row is not None
    original = row.title
    row.title = "Edited by administrator"
    db.commit()
    seed(db)
    updated = db.get(NewsArticle, "n-belair-2")
    assert updated.title == "Edited by administrator"
    updated.title = original
    db.commit()


def test_seeded_belair_demo_articles_are_database_backed(client):
    admin = belair_admin(client)
    admin_site = client.get("/api/admin/site", headers=admin).json()
    public_site = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    for title in (
        "Grade 11 mock examinations begin Monday",
        "Footballers first through to daCosta Cup round of 32",
    ):
        assert title in titles(admin_site)
        assert title in titles(public_site)
    assert public_site["content"]["homepage"]["heroTitle"]
    assert public_site["content"]["quickLinks"]
    assert public_site["content"]["programmes"]
    assert public_site["content"]["values"]


def test_frontend_does_not_use_seed_as_live_fallback():
    tenant = (ROOT / "src" / "contexts" / "TenantContext.tsx").read_text(encoding="utf-8")
    content = (ROOT / "src" / "services" / "content.ts").read_text(encoding="utf-8")
    source = (ROOT / "src" / "config" / "contentSource.ts").read_text(encoding="utf-8")
    public_layout = (ROOT / "src" / "layouts" / "PublicLayout.tsx").read_text(encoding="utf-8")
    assert "allowSeedFallback" in source
    assert "import.meta.env.DEV" in source
    assert "allowSeedFallback" in tenant
    assert "allowSeedFallback" in content
    assert "hydrateFromRemote(seed" in tenant
    assert "if (allowSeedFallback()" in tenant
    assert "Unable to load this school website" in public_layout
    assert "Grade 11 mock examinations begin Monday" in (ROOT / "src" / "data" / "seed.ts").read_text(encoding="utf-8")
    assert "never from this file" in (ROOT / "src" / "data" / "seed.ts").read_text(encoding="utf-8")
