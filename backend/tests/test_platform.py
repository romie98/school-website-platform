from app.models.content import HomepageSection, NewsArticle
from app.models.school import School
from app.seed import BELAIR


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_school_admin_cannot_create_platform_school(client):
    token = login(client, "admin@belairhighschoolja.com", "belair1968")
    res = client.post("/api/platform/schools", headers=token, json={"name": "Hacked", "slug": "hacked-school"})
    assert res.status_code == 403


def test_super_admin_creates_school_with_admin_and_domain(client, db):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    res = client.post("/api/platform/schools", headers=token, json={
        "name": "Ridge High School",
        "slug": "ridge-high",
        "motto": "Climb higher",
        "customDomain": "ridgehigh.edu.jm",
        "theme": "modern",
        "status": "active",
        "adminName": "Ridge Admin",
        "adminEmail": "admin@ridgehigh.edu.jm",
        "adminPassword": "ridge1968x",
        "features": {"gallery": False},
    })
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["slug"] == "ridge-high"
    assert body["status"] == "active"
    assert body["customDomain"] == "ridgehigh.edu.jm"
    assert body["theme"] == "modern"
    assert body["primaryColor"] == "#0F766E"
    assert body["features"]["gallery"] is False
    assert body["features"]["news"] is True
    assert any(row["domain"] == "ridgehigh.edu.jm" for row in body["domains"])
    assert any(row["domain"] == "ridge-high.schoolplatform.com" for row in body["domains"])

    site = client.get("/api/public/site", headers={"Host": "ridgehigh.edu.jm"})
    assert site.status_code == 200
    payload = site.json()
    assert payload["school"]["slug"] == "ridge-high"
    types = [s["section_type"] for s in payload["homepage_sections"]]
    assert types[0] == "hero"
    assert "news" in types

    admin = login(client, "admin@ridgehigh.edu.jm", "ridge1968x")
    news = client.post("/api/admin/news", headers=admin, json={"title": "Ridge only", "slug": "ridge-only", "status": "published"})
    assert news.status_code == 200
    assert news.json()["mode"] == "pending"
    hidden = client.get(f"/api/admin/changes/{news.json()['change']['id']}", headers=login(client, "admin@belairhighschoolja.com", "belair1968"))
    assert hidden.status_code == 404

    belair = db.query(NewsArticle).filter(NewsArticle.school_id == BELAIR).count()
    assert belair >= 1
    assert db.query(HomepageSection).filter(HomepageSection.school_id == body["id"]).count() >= 3
    assert payload["theme"]["primaryColor"] == "#0F766E"
    assert payload["theme"]["theme"] == "modern"
    hero = next(s for s in payload["homepage_sections"] if s["section_type"] == "hero")
    assert hero["variant"] == "split"


def test_domain_cannot_be_reused(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    created = client.post("/api/platform/schools", headers=token, json={
        "name": "Harbor School",
        "slug": "harbor-school",
        "customDomain": "harborschool.edu.jm",
        "adminEmail": "admin@harborschool.edu.jm",
        "adminPassword": "harbor1968",
    })
    assert created.status_code == 200, created.text
    school_id = created.json()["id"]

    taken = client.post(
        f"/api/platform/schools/{school_id}/domains",
        headers=token,
        json={"domain": "belairhigh.edu.jm"},
    )
    assert taken.status_code == 400

    duplicate_school = client.post("/api/platform/schools", headers=token, json={
        "name": "Copy",
        "slug": "harbor-copy",
        "customDomain": "harborschool.edu.jm",
        "adminEmail": "copy@harborschool.edu.jm",
        "adminPassword": "harbor1968",
    })
    assert duplicate_school.status_code == 400


def test_suspend_blocks_admin_and_keeps_data(client, db):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    created = client.post("/api/platform/schools", headers=token, json={
        "name": "Pause Academy",
        "slug": "pause-academy",
        "customDomain": "pauseacademy.edu.jm",
        "adminEmail": "admin@pauseacademy.edu.jm",
        "adminPassword": "pause1968x",
        "status": "active",
    }).json()
    school_id = created["id"]
    token = login(client, "platform@schoolplatform.com", "platform1968")
    principal_res = client.post(
        f"/api/platform/schools/{school_id}/admins",
        headers=token,
        json={"name": "Pause Principal", "email": "principal@pauseacademy.edu.jm", "password": "pause1968x", "role": "principal"},
    )
    assert principal_res.status_code == 200, principal_res.text
    principal = login(client, "principal@pauseacademy.edu.jm", "pause1968x")
    article = client.post("/api/admin/news", headers=principal, json={"title": "Keep me", "slug": "keep-me", "status": "published"})
    assert article.status_code == 200
    article_id = article.json()["record"]["id"]

    patched = client.patch(f"/api/platform/schools/{school_id}", headers=token, json={"status": "suspended"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "suspended"

    blocked = client.post("/api/auth/login", json={"username": "admin@pauseacademy.edu.jm", "password": "pause1968x"})
    assert blocked.status_code == 403
    public = client.get("/api/public/site", headers={"Host": "pauseacademy.edu.jm"})
    assert public.status_code == 503

    row = db.get(NewsArticle, article_id)
    assert row is not None
    assert row.title == "Keep me"
    school = db.get(School, school_id)
    assert school.status == "suspended"

    restored = client.patch(f"/api/platform/schools/{school_id}", headers=token, json={"status": "active"})
    assert restored.status_code == 200
    again = login(client, "admin@pauseacademy.edu.jm", "pause1968x")
    assert client.get(f"/api/admin/news/{article_id}", headers=again).status_code == 200


def test_archived_school_is_unknown_publicly(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    created = client.post("/api/platform/schools", headers=token, json={
        "name": "Archive School",
        "slug": "archive-school",
        "customDomain": "archiveschool.edu.jm",
        "adminEmail": "admin@archiveschool.edu.jm",
        "adminPassword": "archive1968",
    }).json()
    client.patch(f"/api/platform/schools/{created['id']}", headers=token, json={"status": "archived"})
    public = client.get("/api/public/site", headers={"Host": "archiveschool.edu.jm"})
    assert public.status_code == 404


def test_platform_stats_and_users(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    stats = client.get("/api/platform/stats", headers=token)
    assert stats.status_code == 200
    body = stats.json()
    assert body["schools"] >= 3
    users = client.get("/api/platform/users", headers=token)
    assert users.status_code == 200
    emails = {row["email"] for row in users.json()}
    assert "platform@schoolplatform.com" in emails
    domains = client.get("/api/platform/domains", headers=token)
    assert domains.status_code == 200
    assert any(row["domain"] == "belairhigh.edu.jm" for row in domains.json())


def test_cannot_assign_super_admin_from_platform_user_patch(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    res = client.patch("/api/platform/users/u-belair-admin", headers=token, json={"role": "super_admin"})
    assert res.status_code == 403
    user = client.get("/api/platform/users", headers=token).json()
    belair = next(row for row in user if row["id"] == "u-belair-admin")
    assert belair["role"] == "school_admin"


def test_public_tenants_include_newly_created_school(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    created = client.post("/api/platform/schools", headers=token, json={
        "name": "Valley Prep",
        "slug": "valley-prep",
        "adminEmail": "admin@valleyprep.edu.jm",
        "adminPassword": "valley1968",
        "status": "trial",
    })
    assert created.status_code == 200, created.text
    listed = client.get("/api/platform/schools", headers=token)
    assert listed.status_code == 200
    slugs = {row["slug"] for row in listed.json()}
    assert "valley-prep" in slugs
    public = client.get("/api/public/tenants")
    assert public.status_code == 200
    public_slugs = {row["slug"] for row in public.json()}
    assert {"belair-high", "manchester-high", "demo-academy", "valley-prep"} <= public_slugs


def test_christiana_sky_is_isolated_from_other_tenants(client, db):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    existing = db.query(School).filter(School.slug == "christiana-high-school").first()
    if existing is None:
        created = client.post("/api/platform/schools", headers=token, json={
            "name": "Christiana High School",
            "slug": "christiana-high-school",
            "theme": "classic",
            "primaryColor": "#0B3D2E",
            "secondaryColor": "#FFD100",
            "accentColor": "#145C45",
            "motto": "Our Best Jamaica Hope",
            "adminEmail": "admin@christiana.test",
            "adminPassword": "christiana1968",
        })
        assert created.status_code == 200, created.text
    from app.seed import apply_christiana_sky
    apply_christiana_sky(db)
    db.commit()

    site = client.get("/api/public/site", params={"tenant": "christiana-high-school"})
    assert site.status_code == 200
    payload = site.json()
    assert payload["school"]["slug"] == "christiana-high-school"
    assert payload["theme"]["theme"] == "sky"
    assert payload["theme"]["primaryColor"] == "#073B52"
    assert payload["theme"]["secondaryColor"] == "#53C7E8"
    assert payload["theme"]["navbarStyle"] == "light"
    assert payload["theme"]["heroStyle"] == "spotlight"
    types = [row["section_type"] for row in payload["homepage_sections"]]
    assert types[0] == "hero"
    assert payload["homepage_sections"][0]["variant"] == "spotlight"
    assert "principal" in types
    assert "school-life" in types
    assert "achievements" in types
    assert payload["content"]["branding"]["schoolName"] == "Christiana High School"

    belair = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert belair["theme"]["theme"] == "classic"
    assert belair["theme"]["primaryColor"] == "#0B3D2E"
    assert belair["homepage_sections"][0]["variant"] == "full-image"

    man = client.get("/api/public/site", headers={"Host": "manchesterhigh.edu.jm"}).json()
    assert man["theme"]["theme"] == "heritage"
    assert man["theme"]["primaryColor"] == "#241A00"

    chs = login(client, "admin@christiana.test", "christiana1968")
    belair_admin = login(client, "admin@belairhighschoolja.com", "belair1968")
    article = client.post("/api/admin/news", headers=chs, json={
        "title": "Christiana only",
        "slug": "christiana-only",
        "status": "published",
    })
    assert article.status_code == 200
    change_id = article.json()["change"]["id"]
    hidden = client.get(f"/api/admin/changes/{change_id}", headers=belair_admin)
    assert hidden.status_code == 404
    own = client.get(f"/api/admin/changes/{change_id}", headers=chs)
    assert own.status_code == 200
    cross = client.put("/api/admin/news/n-belair-1", headers=chs, json={"title": "Hacked"})
    assert cross.status_code == 404


def test_knox_minimal_replaces_copied_belair_look(client, db):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    created = client.post("/api/platform/schools", headers=token, json={
        "name": "Knox College",
        "slug": "knox-college",
        "theme": "classic",
        "primaryColor": "#0B3D2E",
        "secondaryColor": "#FFD100",
        "accentColor": "#145C45",
        "motto": "Nothing But Greatness",
        "adminEmail": "admin@knoxcollege.test",
        "adminPassword": "knox1968xx",
    })
    assert created.status_code == 200, created.text
    from app.seed import apply_knox_minimal
    apply_knox_minimal(db)
    db.commit()

    site = client.get("/api/public/site", params={"tenant": "knox-college"})
    assert site.status_code == 200
    payload = site.json()
    assert payload["school"]["name"] == "Knox College"
    assert payload["theme"]["theme"] == "minimal"
    assert payload["theme"]["primaryColor"] == "#123A73"
    assert payload["theme"]["secondaryColor"] == "#C8102E"
    assert payload["theme"]["navbarStyle"] == "floating"
    types = [row["section_type"] for row in payload["homepage_sections"]]
    assert types == ["hero", "welcome", "news", "events", "cta", "motto"]
    assert payload["homepage_sections"][0]["variant"] == "compact"
    belair = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert belair["theme"]["primaryColor"] == "#0B3D2E"
    assert belair["theme"]["theme"] == "classic"
