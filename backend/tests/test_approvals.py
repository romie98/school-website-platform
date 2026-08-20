from app.models.content import NewsArticle
from app.seed import BELAIR


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def belair_admin(client):
    return login(client, "admin@belairhighschoolja.com", "belair1968")


def belair_principal(client):
    return login(client, "principal@belairhighschoolja.com", "belair1968")


def man_principal(client):
    return login(client, "principal@manchesterhigh.edu.jm", "manchester1968")


def published_news(client, title: str, slug: str):
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=principal, json={
        "title": title,
        "slug": slug,
        "content": f"<p>{title}</p>",
        "status": "published",
    })
    assert created.status_code == 200, created.text
    return created.json()["record"]


def test_unauthenticated_cannot_review_approvals(client):
    assert client.get("/api/admin/changes").status_code == 401
    assert client.post("/api/admin/changes/x/approve").status_code == 401


def test_admin_can_submit_but_cannot_approve(client, db):
    admin = belair_admin(client)
    created = client.post("/api/admin/news", headers=admin, json={
        "title": "Grade 11 Graduation Ceremony",
        "slug": "grade-11-graduation-ceremony",
        "content": "Graduation will take place at 3:00 PM.",
        "status": "published",
    })
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["mode"] == "pending"
    change_id = body["change"]["id"]
    assert body["change"]["status"] == "pending"
    assert db.query(NewsArticle).filter(NewsArticle.slug == "grade-11-graduation-ceremony", NewsArticle.school_id == BELAIR).first() is None

    denied = client.post(f"/api/admin/changes/{change_id}/approve", headers=admin)
    assert denied.status_code == 403
    still = client.get(f"/api/admin/changes/{change_id}", headers=admin).json()
    assert still["status"] == "pending"


def test_principal_approves_own_school_create(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={
        "title": "Sports Day Results",
        "slug": "sports-day-results-pending",
        "content": "Results will be posted.",
        "status": "published",
    }).json()
    change_id = created["change"]["id"]

    public = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert not any(item["title"] == "Sports Day Results" for item in public["content"]["news"])

    approved = client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    row = db.query(NewsArticle).filter(NewsArticle.slug == "sports-day-results-pending", NewsArticle.school_id == BELAIR).one()
    assert row.title == "Sports Day Results"
    public_after = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert any(item["title"] == "Sports Day Results" for item in public_after["content"]["news"])


def test_principal_cannot_approve_another_school_change(client):
    admin = belair_admin(client)
    other = man_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={
        "title": "Belair private request",
        "slug": "belair-private-request",
        "status": "published",
    }).json()
    change_id = created["change"]["id"]
    cross = client.post(f"/api/admin/changes/{change_id}/approve", headers=other)
    assert cross.status_code == 404
    peek = client.get(f"/api/admin/changes/{change_id}", headers=other)
    assert peek.status_code == 404


def test_update_keeps_published_version_until_approval(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    article = published_news(client, "Graduation Ceremony", "graduation-ceremony-live")
    article_id = article["id"]

    updated = client.put(f"/api/admin/news/{article_id}", headers=admin, json={
        "title": "Graduation Ceremony",
        "slug": "graduation-ceremony-live",
        "content": "Graduation begins at 4:00 PM.",
        "status": "published",
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()["mode"] == "pending"
    live = db.get(NewsArticle, article_id)
    assert live.content == "<p>Graduation Ceremony</p>"

    change_id = updated.json()["change"]["id"]
    client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    db.refresh(live)
    assert "4:00 PM" in live.content


def test_delete_requires_approval(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    article = NewsArticle(
        school_id=BELAIR, slug="to-delete-pending", title="Delete me",
        excerpt="", content="<p>Soon gone</p>", category="General", author="Admin",
        date="2026-08-19", status="published",
    )
    db.add(article)
    db.commit()
    article_id = article.id

    requested = client.delete(f"/api/admin/news/{article_id}", headers=admin)
    assert requested.status_code == 200
    assert requested.json()["mode"] == "pending"
    assert db.get(NewsArticle, article_id) is not None

    change_id = requested.json()["change"]["id"]
    approved = client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert approved.status_code == 200, approved.text
    assert client.get(f"/api/admin/news/{article_id}", headers=principal).status_code == 404


def test_decline_stores_reason_and_leaves_public_unchanged(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    article = published_news(client, "Official title", "official-title-live")
    article_id = article["id"]
    updated = client.put(f"/api/admin/news/{article_id}", headers=admin, json={
        "title": "Should not publish",
        "slug": "official-title-live",
        "status": "published",
    }).json()
    change_id = updated["change"]["id"]
    declined = client.post(f"/api/admin/changes/{change_id}/decline", headers=principal, json={
        "reason": "Please confirm the event time before publishing.",
    })
    assert declined.status_code == 200
    body = declined.json()
    assert body["status"] == "declined"
    assert "confirm the event time" in body["declineReason"]
    live = db.get(NewsArticle, article_id)
    assert live.title == "Official title"
    seen = client.get(f"/api/admin/changes/{change_id}", headers=admin).json()
    assert seen["declineReason"] == "Please confirm the event time before publishing."


def test_decline_reason_required(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={"title": "Needs reason", "slug": "needs-reason", "status": "published"}).json()
    res = client.post(f"/api/admin/changes/{created['change']['id']}/decline", headers=principal, json={"reason": "  "})
    assert res.status_code == 422


def test_resubmit_creates_new_pending_and_keeps_declined(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={
        "title": "Resubmit me",
        "slug": "resubmit-me",
        "content": "First draft",
        "status": "published",
    }).json()
    original_id = created["change"]["id"]
    client.post(f"/api/admin/changes/{original_id}/decline", headers=principal, json={"reason": "Please use the official photograph."})
    again = client.post(f"/api/admin/changes/{original_id}/resubmit", headers=admin, json={
        "newData": {"title": "Resubmit me", "slug": "resubmit-me", "content": "Revised draft", "status": "published"},
    })
    assert again.status_code == 200, again.text
    new_change = again.json()
    assert new_change["id"] != original_id
    assert new_change["status"] == "pending"
    assert new_change["supersedesId"] == original_id
    original = client.get(f"/api/admin/changes/{original_id}", headers=admin).json()
    assert original["status"] == "declined"


def test_conflicting_pending_update_is_blocked(client):
    admin = belair_admin(client)
    article = published_news(client, "Conflict source", "conflict-source-live")
    first = client.put(f"/api/admin/news/{article['id']}", headers=admin, json={"title": "First pending", "status": "published"})
    assert first.status_code == 200
    second = client.put(f"/api/admin/news/{article['id']}", headers=admin, json={"title": "Second pending", "status": "published"})
    assert second.status_code == 409
    detail = second.json()["detail"]
    assert detail["code"] == "pending_exists"


def test_double_approval_is_prevented(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={"title": "Once only", "slug": "once-only", "status": "published"}).json()
    change_id = created["change"]["id"]
    first = client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert first.status_code == 200
    second = client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert second.status_code == 409


def test_principal_publishes_directly_with_audit(client, db):
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=principal, json={
        "title": "Principal's Message note",
        "slug": "principal-direct-note",
        "status": "published",
        "content": "<p>Published immediately.</p>",
    })
    assert created.status_code == 200
    body = created.json()
    assert body["mode"] == "published"
    assert body["record"]["title"] == "Principal's Message note"
    row = db.query(NewsArticle).filter(NewsArticle.slug == "principal-direct-note").one()
    assert row.status == "published"
    audit = client.get("/api/admin/audit", headers=principal).json()
    assert any(item["action"] == "PRINCIPAL_DIRECT_PUBLISH" for item in audit["items"])


def test_super_admin_platform_access_unchanged(client):
    token = login(client, "platform@schoolplatform.com", "platform1968")
    res = client.get("/api/platform/schools", headers=token)
    assert res.status_code == 200
    blocked = client.get("/api/admin/changes", headers=token)
    assert blocked.status_code == 403


def test_notifications_on_submit_and_review(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={"title": "Notify me", "slug": "notify-me", "status": "published"}).json()
    notes = client.get("/api/admin/notifications", headers=principal).json()
    assert notes["unread"] >= 1
    assert any("Notify me" in item["body"] for item in notes["items"])
    client.post(f"/api/admin/changes/{created['change']['id']}/approve", headers=principal)
    admin_notes = client.get("/api/admin/notifications", headers=admin).json()
    assert any("approved" in item["title"].lower() for item in admin_notes["items"])


def test_tenant_isolation_for_change_lists(client):
    admin_a = belair_admin(client)
    admin_b = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    created = client.post("/api/admin/news", headers=admin_a, json={"title": "School A only", "slug": "school-a-only", "status": "published"}).json()
    listed = client.get("/api/admin/changes", headers=admin_b).json()
    assert all(item["id"] != created["change"]["id"] for item in listed)
    assert client.get(f"/api/admin/changes/{created['change']['id']}", headers=admin_b).status_code == 404
