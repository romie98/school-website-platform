from app.models.content import Document, GalleryAlbum, MediaAsset, NewsArticle, Page
from app.models.school import School
from app.services.tenant_service import resolve_tenant
from app.seed import BELAIR, MANCHESTER


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_login_issues_tenant_claim(client):
    res = client.post("/api/auth/login", json={"username": "admin@belairhighschoolja.com", "password": "belair1968"})
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["school_id"] == BELAIR
    assert body["user"]["role"] == "school_admin"


def test_super_admin_has_null_school(client):
    res = client.post("/api/auth/login", json={"username": "platform@schoolplatform.com", "password": "platform1968"})
    assert res.status_code == 200
    assert res.json()["user"]["role"] == "super_admin"
    assert res.json()["user"]["school_id"] is None


def test_news_isolation_read_update_delete(client):
    a = login(client, "admin@belairhighschoolja.com", "belair1968")
    b = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")

    own = client.get("/api/admin/news/n-belair-1", headers=a)
    assert own.status_code == 200
    assert "daCosta" in own.json()["title"]

    cross = client.get("/api/admin/news/n-man-1", headers=a)
    assert cross.status_code == 404

    edit = client.put("/api/admin/news/n-man-1", headers=a, json={"title": "Hacked", "slug": "hacked"})
    assert edit.status_code == 404

    delete = client.delete("/api/admin/news/n-man-1", headers=a)
    assert delete.status_code == 404

    still = client.get("/api/admin/news/n-man-1", headers=b)
    assert still.status_code == 200
    assert still.json()["title"] != "Hacked"

    created = client.post("/api/admin/news", headers=a, json={"title": "Belair only", "slug": "belair-only", "school_id": MANCHESTER, "status": "published"})
    assert created.status_code == 200
    assert created.json()["mode"] == "pending"
    change_id = created.json()["change"]["id"]
    hidden = client.get(f"/api/admin/changes/{change_id}", headers=b)
    assert hidden.status_code == 404
    public = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert not any(item["title"] == "Belair only" for item in public["content"]["news"])


def test_pages_events_staff_documents_galleries_media_users_settings(client, db):
    a = login(client, "admin@belairhighschoolja.com", "belair1968")
    b = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")

    page = db.query(Page).filter(Page.school_id == MANCHESTER).first()
    assert client.get(f"/api/admin/pages/{page.id}", headers=a).status_code == 404
    assert client.get(f"/api/admin/pages/{page.id}", headers=b).status_code == 200

    assert client.get("/api/admin/events/e-man-1", headers=a).status_code == 404
    assert client.get("/api/admin/events/e-belair-1", headers=a).status_code == 200
    assert client.put("/api/admin/events/e-man-1", headers=a, json={"title": "x"}).status_code == 404
    assert client.delete("/api/admin/events/e-man-1", headers=a).status_code == 404

    assert client.get("/api/admin/staff/s-man-1", headers=a).status_code == 404
    assert client.get("/api/admin/staff/s-belair-1", headers=a).status_code == 200

    man_doc = Document(id="doc-man", school_id=MANCHESTER, name="Manchester handbook", status="published")
    man_album = GalleryAlbum(id="gal-man", school_id=MANCHESTER, slug="campus", title="Campus")
    man_media = MediaAsset(id="med-man", school_id=MANCHESTER, filename="x.jpg", storage_key="schools/m/x.jpg", url="/x.jpg", mime_type="image/jpeg")
    db.add_all([man_doc, man_album, man_media])
    db.commit()

    assert client.get("/api/admin/documents/doc-man", headers=a).status_code == 404
    assert client.delete("/api/admin/documents/doc-man", headers=a).status_code == 404
    assert client.get("/api/admin/documents/doc-man", headers=b).status_code == 200

    assert client.get("/api/admin/galleries/gal-man", headers=a).status_code == 404
    assert client.delete("/api/admin/galleries/gal-man", headers=a).status_code == 404
    assert client.get("/api/admin/galleries/gal-man", headers=b).status_code == 200

    assert client.get("/api/admin/media/med-man", headers=a).status_code == 404
    assert client.delete("/api/admin/media/med-man", headers=a).status_code == 404
    assert client.get("/api/admin/media/med-man", headers=b).status_code == 200

    users_a = client.get("/api/admin/users", headers=a).json()
    assert all(u["email"].endswith("belairhighschoolja.com") or "Bel-Air" in u["name"] for u in users_a)
    assert not any("manchester" in u["email"] for u in users_a)

    assert client.put("/api/admin/users/u-man-admin", headers=a, json={"name": "Hacked"}).status_code == 404

    settings_a = client.get("/api/admin/settings", headers=a).json()
    assert settings_a["school"]["slug"] == "belair-high"
    settings_b = client.get("/api/admin/settings", headers=b).json()
    assert settings_b["school"]["slug"] == "manchester-high"


def test_public_hostname_resolution(client, db):
    belair = resolve_tenant(db, hostname="www.belairhigh.edu.jm")
    man = resolve_tenant(db, hostname="manchester.schoolplatform.com")
    assert belair.slug == "belair-high"
    assert man.slug == "manchester-high"
    assert belair.id != man.id

    site_a = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"})
    site_b = client.get("/api/public/site", headers={"Host": "manchesterhigh.edu.jm"})
    assert site_a.status_code == 200
    assert site_b.status_code == 200
    assert site_a.json()["school"]["slug"] == "belair-high"
    assert site_b.json()["school"]["slug"] == "manchester-high"
    titles_a = {item["title"] for item in site_a.json()["content"]["news"]}
    titles_b = {item["title"] for item in site_b.json()["content"]["news"]}
    assert any("daCosta" in t for t in titles_a)
    assert "Science fair winners announced" in titles_b
    assert "Science fair winners announced" not in titles_a


def test_unknown_domain(client):
    res = client.get("/api/public/site", headers={"Host": "unknown.example.com"})
    assert res.status_code == 404


def test_dev_slug_override(client):
    res = client.get("/api/public/site", params={"tenant": "demo-academy"})
    assert res.status_code == 200
    assert res.json()["school"]["slug"] == "demo-academy"


def test_school_admin_cannot_list_platform_schools(client):
    a = login(client, "admin@belairhighschoolja.com", "belair1968")
    res = client.get("/api/platform/schools", headers=a)
    assert res.status_code == 403


def test_school_admin_cms_loads_own_school_not_host_tenant(client):
    token = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    res = client.get("/api/admin/site", headers={**token, "Host": "belairhigh.edu.jm"})
    assert res.status_code == 200, res.text
    assert res.json()["school"]["slug"] == "manchester-high"
    login_res = client.post("/api/auth/login", json={"username": "admin@manchesterhigh.edu.jm", "password": "manchester1968"})
    assert login_res.json()["user"]["school_slug"] == "manchester-high"


def test_super_admin_lists_schools(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    res = client.get("/api/platform/schools", headers=token)
    assert res.status_code == 200
    slugs = {row["slug"] for row in res.json()}
    assert {"belair-high", "manchester-high", "demo-academy"} <= slugs


def test_suspended_school_blocks_admin(client, db):
    school = db.get(School, MANCHESTER)
    school.status = "suspended"
    db.commit()
    res = client.post("/api/auth/login", json={"username": "admin@manchesterhigh.edu.jm", "password": "manchester1968"})
    assert res.status_code == 403
    school.status = "active"
    db.commit()


def test_production_ignores_tenant_query(client, monkeypatch):
    class ProdSettings:
        is_development = False
        platform_domain = "schoolplatform.com"
        default_tenant_slug = "belair-high"

    monkeypatch.setattr("app.dependencies.tenant.get_settings", lambda: ProdSettings())
    monkeypatch.setattr("app.services.tenant_service.get_settings", lambda: ProdSettings())
    res = client.get(
        "/api/public/site",
        params={"tenant": "demo-academy"},
        headers={"Host": "belairhigh.edu.jm"},
    )
    assert res.status_code == 200
    assert res.json()["school"]["slug"] == "belair-high"


def test_school_admin_cannot_assign_super_admin(client):
    a = login(client, "admin@belairhighschoolja.com", "belair1968")
    res = client.put("/api/admin/users/u-belair-admin", headers=a, json={"role": "super_admin"})
    assert res.status_code == 403


def test_school_users_are_tenant_specific(client):
    a = login(client, "admin@belairhighschoolja.com", "belair1968")
    b = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    belair = client.get("/api/admin/users", headers=a).json()
    man = client.get("/api/admin/users", headers=b).json()
    belair_emails = {row["email"] for row in belair}
    man_emails = {row["email"] for row in man}
    assert "admin@belairhighschoolja.com" in belair_emails
    assert "principal@belairhighschoolja.com" in belair_emails
    assert not any("manchester" in email for email in belair_emails)
    assert "admin@manchesterhigh.edu.jm" in man_emails
    assert not any("belair" in email for email in man_emails)


def test_editor_cannot_manage_users(client):
    admin = login(client, "admin@belairhighschoolja.com", "belair1968")
    created = client.post("/api/admin/users", headers=admin, json={
        "name": "Editor One",
        "email": "editor1@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    })
    assert created.status_code == 200, created.text
    colleague = client.post("/api/admin/users", headers=admin, json={
        "name": "Editor Two",
        "email": "editor2@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    }).json()
    editor = login(client, "editor1@belairhighschoolja.com", "editor1968")
    assert client.get("/api/admin/users", headers=editor).status_code == 403
    assert client.post("/api/admin/users", headers=editor, json={
        "name": "Editor Three",
        "email": "editor3@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    }).status_code == 403
    assert client.put(
        f"/api/admin/users/{colleague['id']}",
        headers=editor,
        json={"role": "Principal"},
    ).status_code == 403


def test_admin_cannot_promote_or_modify_principal(client):
    admin = login(client, "admin@belairhighschoolja.com", "belair1968")
    editor = client.post("/api/admin/users", headers=admin, json={
        "name": "Editor Four",
        "email": "editor4@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    }).json()
    assert client.put(
        f"/api/admin/users/{editor['id']}",
        headers=admin,
        json={"role": "Principal"},
    ).status_code == 403
    assert client.post("/api/admin/users", headers=admin, json={
        "name": "New Principal",
        "email": "newprincipal@belairhighschoolja.com",
        "password": "principal1968",
        "role": "Principal",
    }).status_code == 403
    assert client.put(
        "/api/admin/users/u-belair-principal",
        headers=admin,
        json={"password": "hacked1968", "name": "Hacked Principal"},
    ).status_code == 403
    assert client.delete("/api/admin/users/u-belair-principal", headers=admin).status_code == 403


def test_admin_can_reset_editor_password(client):
    admin = login(client, "admin@belairhighschoolja.com", "belair1968")
    editor = client.post("/api/admin/users", headers=admin, json={
        "name": "Editor Five",
        "email": "editor5@belairhighschoolja.com",
        "password": "editor1968",
        "role": "Content Editor",
    }).json()
    updated = client.put(
        f"/api/admin/users/{editor['id']}",
        headers=admin,
        json={"password": "neweditor1", "role": "Content Editor"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["role"] == "editor"
    login(client, "editor5@belairhighschoolja.com", "neweditor1")


def test_principal_can_promote_editor_to_principal(client):
    principal = login(client, "principal@belairhighschoolja.com", "belair1968")
    editor = client.post("/api/admin/users", headers=principal, json={
        "name": "Editor Six",
        "email": "editor6@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    }).json()
    promoted = client.put(
        f"/api/admin/users/{editor['id']}",
        headers=principal,
        json={"role": "Principal"},
    )
    assert promoted.status_code == 200, promoted.text
    assert promoted.json()["role"] == "principal"


def test_homepage_sections_are_tenant_specific(client):
    a = login(client, "principal@belairhighschoolja.com", "belair1968")
    b = login(client, "principal@manchesterhigh.edu.jm", "manchester1968")

    site_a = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    site_b = client.get("/api/public/site", headers={"Host": "manchesterhigh.edu.jm"}).json()
    types_a = [s["section_type"] for s in site_a["homepage_sections"] if s["enabled"]]
    types_b = [s["section_type"] for s in site_b["homepage_sections"] if s["enabled"]]
    assert types_a != types_b
    assert types_a[0] == "hero"
    assert types_b[0] == "hero"
    assert site_a["homepage_sections"][0]["variant"] == "full-image"
    assert site_b["homepage_sections"][0]["variant"] == "cinematic"

    own = client.get("/api/admin/homepage-sections", headers=a)
    assert own.status_code == 200
    payload = [{"section_type": "hero", "variant": "compact", "enabled": True, "position": 0}]
    saved = client.put("/api/admin/homepage-sections", headers=a, json=payload)
    assert saved.status_code == 200
    assert saved.json()["mode"] == "published"
    assert saved.json()["record"][0]["variant"] == "compact"

    man = client.get("/api/admin/homepage-sections", headers=b).json()
    assert man[0]["variant"] == "cinematic"
    assert any(s["section_type"] == "news" for s in man)

    site_a_after = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert [s["section_type"] for s in site_a_after["homepage_sections"]] == ["hero"]
    site_b_after = client.get("/api/public/site", headers={"Host": "manchesterhigh.edu.jm"}).json()
    assert any(s["section_type"] == "news" for s in site_b_after["homepage_sections"])

    restored = [
        {"section_type": name, "variant": variant, "enabled": True, "position": i}
        for i, (name, variant) in enumerate([
            ("hero", "full-image"), ("quick_links", "default"), ("welcome", "default"),
            ("principal", "default"), ("news", "featured"), ("events", "cards"),
            ("statistics", "default"), ("academics", "default"), ("school-life", "default"),
            ("gallery", "grid"), ("cta", "default"),
        ])
    ]
    assert client.put("/api/admin/homepage-sections", headers=a, json=restored).status_code == 200


def test_theme_settings_are_tenant_specific(client):
    demo = login(client, "principal@demoacademy.edu.jm", "demo1968")
    man = login(client, "principal@manchesterhigh.edu.jm", "manchester1968")

    updated = client.put(
        "/api/admin/settings",
        headers=demo,
        json={
            "theme": "heritage",
            "applyPreset": True,
            "primaryColor": "#5C3317",
            "secondaryColor": "#D4A017",
            "accentColor": "#8B5A2B",
            "schoolName": "Demo Academy",
            "motto": "Learn. Lead. Serve.",
        },
    )
    assert updated.status_code == 200, updated.text

    site_demo = client.get("/api/public/site", headers={"Host": "demo.schoolplatform.com"})
    site_man = client.get("/api/public/site", headers={"Host": "manchesterhigh.edu.jm"})
    assert site_demo.status_code == 200
    theme = site_demo.json()["theme"]
    assert theme["theme"] == "heritage"
    assert theme["primaryColor"] == "#5C3317"
    assert theme["headingFont"] == "Playfair Display"
    assert site_demo.json()["settings"]["schoolName"] == "Demo Academy"
    assert site_man.json()["theme"]["theme"] == "heritage"
    assert site_man.json()["theme"]["primaryColor"] == "#241A00"
    assert site_man.json()["content"]["branding"]["schoolName"] == "Manchester High School"

    denied = client.put("/api/admin/settings", headers=man, json={"theme": "not-a-theme"})
    assert denied.status_code == 400

    themes = client.get("/api/admin/themes", headers=demo)
    assert themes.status_code == 200
    ids = {row["id"] for row in themes.json()}
    assert ids == {"classic", "modern", "academic", "heritage", "minimal", "sky"}
