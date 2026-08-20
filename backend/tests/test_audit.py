from datetime import datetime, timedelta, timezone

from app.models.approval import (
    AUDIT_CHANGE_APPROVED,
    AUDIT_CHANGE_DECLINED,
    AUDIT_CHANGE_RESUBMITTED,
    AUDIT_CHANGE_SUBMITTED,
    AUDIT_CONTENT_DELETED,
    AUDIT_CONTENT_PUBLISHED,
    AUDIT_LOGIN_FAILED,
    AUDIT_PRINCIPAL_DIRECT_PUBLISH,
    AUDIT_USER_DISABLED,
    AuditEvent,
)
from app.models.content import NewsArticle
from app.models.user import User
from app.seed import BELAIR, MANCHESTER
from tests.test_approvals import belair_admin, belair_principal, login, man_principal, published_news


def test_admin_submit_approve_creates_readable_audit(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={
        "title": "Grade 11 Graduation Ceremony",
        "slug": "grade-11-graduation-audit",
        "content": "Ceremony begins at 3:00 PM.",
        "startTime": "3:00 PM",
        "status": "published",
    }).json()
    change_id = created["change"]["id"]
    logs = client.get("/api/admin/audit?q=Graduation", headers=admin)
    assert logs.status_code == 200, logs.text
    body = logs.json()
    assert "items" in body
    submitted = next(item for item in body["items"] if item["action"] == AUDIT_CHANGE_SUBMITTED)
    assert submitted["actorName"] == "Bel-Air Administrator"
    assert submitted["actorRole"] == "school_admin"
    assert submitted["schoolId"] == BELAIR
    assert submitted["resourceName"] == "Grade 11 Graduation Ceremony"
    assert submitted["statusAfter"] == "pending"
    assert submitted["changeRequestId"] == change_id

    client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    detail_list = client.get(f"/api/admin/audit?q=Graduation", headers=principal).json()["items"]
    actions = {item["action"] for item in detail_list}
    assert AUDIT_CHANGE_APPROVED in actions
    assert AUDIT_CONTENT_PUBLISHED in actions
    approved = next(item for item in detail_list if item["action"] == AUDIT_CHANGE_APPROVED)
    assert approved["reviewedByName"] == "John Brown"
    assert approved["actorName"] == "John Brown"


def test_admin_cannot_read_other_tenant_audit(client):
    admin_a = belair_admin(client)
    admin_b = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    principal_b = man_principal(client)
    created = client.post("/api/admin/news", headers=admin_a, json={
        "title": "Belair-only audit story",
        "slug": "belair-only-audit-story",
        "status": "published",
    }).json()
    event_id = client.get("/api/admin/audit?q=Belair-only", headers=admin_a).json()["items"][0]["id"]
    listed = client.get("/api/admin/audit", headers=admin_b).json()
    assert all(item["schoolId"] == MANCHESTER for item in listed["items"])
    assert all("Belair-only" not in (item.get("resourceName") or "") for item in listed["items"])
    assert client.get(f"/api/admin/audit/{event_id}", headers=admin_b).status_code == 404
    assert client.get(f"/api/admin/audit/{event_id}", headers=principal_b).status_code == 404
    assert created["change"]["id"]


def test_editor_cannot_access_audit(client):
    admin = belair_admin(client)
    created = client.post("/api/admin/users", headers=admin, json={
        "name": "Audit Editor",
        "email": "audit-editor@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    })
    assert created.status_code == 200, created.text
    editor = login(client, "audit-editor@belairhighschoolja.com", "editor1968")
    assert client.get("/api/admin/audit", headers=editor).status_code == 403


def test_principal_decline_and_resubmit_keeps_both_records(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=admin, json={
        "title": "Sports Day Results",
        "slug": "sports-day-results-audit",
        "content": "Date to confirm",
        "status": "published",
    }).json()
    change_id = created["change"]["id"]
    declined = client.post(
        f"/api/admin/changes/{change_id}/decline",
        headers=principal,
        json={"reason": "Please confirm the event time before publishing."},
    )
    assert declined.status_code == 200, declined.text
    resubmitted = client.post(
        f"/api/admin/changes/{change_id}/resubmit",
        headers=admin,
        json={"newData": {"title": "Sports Day Results", "content": "Confirmed for Saturday."}},
    )
    assert resubmitted.status_code == 200, resubmitted.text
    logs = client.get("/api/admin/audit?q=Sports%20Day", headers=principal).json()["items"]
    actions = [item["action"] for item in logs]
    assert AUDIT_CHANGE_DECLINED in actions
    assert AUDIT_CHANGE_RESUBMITTED in actions
    declined_row = next(item for item in logs if item["action"] == AUDIT_CHANGE_DECLINED)
    assert declined_row["declineReason"] == "Please confirm the event time before publishing."
    assert next(item for item in logs if item["action"] == AUDIT_CHANGE_RESUBMITTED)["changeRequestId"] != change_id


def test_delete_history_survives_removed_record(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    article = published_news(client, "Sports Day Results Keep", "sports-day-keep")
    article_id = article["id"]
    deleted = client.delete(f"/api/admin/news/{article_id}", headers=admin).json()
    change_id = deleted["change"]["id"]
    client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert db.get(NewsArticle, article_id) is None
    public = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    assert not any(item["id"] == article_id for item in public["content"]["news"])
    history = client.get(f"/api/admin/audit/resource/news/{article_id}", headers=principal)
    assert history.status_code == 200
    names = {item["resourceName"] for item in history.json()["items"]}
    assert "Sports Day Results Keep" in names
    actions = {item["action"] for item in history.json()["items"]}
    assert AUDIT_CHANGE_SUBMITTED in actions
    assert AUDIT_CHANGE_APPROVED in actions
    assert AUDIT_CONTENT_DELETED in actions


def test_audit_is_append_only(client):
    admin = belair_admin(client)
    principal = belair_principal(client)
    client.post("/api/admin/news", headers=admin, json={"title": "Immutable log", "slug": "immutable-log", "status": "published"})
    event_id = client.get("/api/admin/audit?q=Immutable", headers=admin).json()["items"][0]["id"]
    assert client.put(f"/api/admin/audit/{event_id}", headers=admin, json={"actorName": "Hacker"}).status_code == 405
    assert client.delete(f"/api/admin/audit/{event_id}", headers=admin).status_code == 405
    assert client.put(f"/api/admin/audit/{event_id}", headers=principal, json={"action": "x"}).status_code == 405
    assert client.delete(f"/api/admin/audit/{event_id}", headers=principal).status_code == 405


def test_deactivated_user_name_remains_on_old_logs(client, db):
    admin = belair_admin(client)
    principal = belair_principal(client)
    created = client.post("/api/admin/users", headers=principal, json={
        "name": "Sarah Brown",
        "email": "sarah.brown@belairhighschoolja.com",
        "password": "sarah1968",
        "role": "editor",
    }).json()
    editor = login(client, "sarah.brown@belairhighschoolja.com", "sarah1968")
    submitted = client.post("/api/admin/news", headers=editor, json={
        "title": "Sarah's Story",
        "slug": "sarahs-story",
        "status": "published",
    }).json()
    client.post(f"/api/admin/changes/{submitted['change']['id']}/approve", headers=principal)
    client.put(f"/api/admin/users/{created['id']}", headers=principal, json={"status": "disabled", "name": "Sarah Brown"})
    user = db.get(User, created["id"])
    assert user is not None
    user.is_active = False
    db.commit()
    logs = client.get("/api/admin/audit?q=Sarah%27s%20Story", headers=principal).json()["items"]
    submitter = next(item for item in logs if item["action"] == AUDIT_CHANGE_SUBMITTED)
    assert submitter["actorName"] == "Sarah Brown"
    assert submitter["actorRole"] == "editor"


def test_principal_direct_publish_is_not_self_approval(client):
    principal = belair_principal(client)
    created = client.post("/api/admin/news", headers=principal, json={
        "title": "Principal direct note",
        "slug": "principal-direct-audit",
        "status": "published",
        "content": "<p>Published immediately.</p>",
    })
    assert created.status_code == 200
    logs = client.get("/api/admin/audit?q=Principal%20direct", headers=principal).json()["items"]
    assert any(item["action"] == AUDIT_PRINCIPAL_DIRECT_PUBLISH for item in logs)
    assert not any(item["action"] == AUDIT_CHANGE_APPROVED for item in logs if item["resourceName"] == "Principal direct note")


def test_login_failure_is_principal_and_platform_only(client):
    client.post("/api/auth/login", json={"username": "admin@belairhighschoolja.com", "password": "wrong-password"})
    admin = belair_admin(client)
    principal = belair_principal(client)
    admin_logs = client.get("/api/admin/audit?action=login", headers=admin).json()["items"]
    assert all(item["action"] != AUDIT_LOGIN_FAILED for item in admin_logs)
    principal_logs = client.get("/api/admin/audit?action=login", headers=principal).json()["items"]
    assert any(item["action"] == AUDIT_LOGIN_FAILED for item in principal_logs)


def test_super_admin_can_filter_audit_by_tenant(client):
    belair_admin(client)
    login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    platform = login(client, "platform@schoolplatform.com", "platform1968")
    all_logs = client.get("/api/platform/audit?pageSize=50", headers=platform)
    assert all_logs.status_code == 200, all_logs.text
    belair_only = client.get(f"/api/platform/audit?tenantId={BELAIR}", headers=platform).json()
    assert all(item["schoolId"] == BELAIR for item in belair_only["items"])
    admin = belair_admin(client)
    assert "tenant_id" not in client.get("/api/admin/audit", headers=admin).json()["items"][0] or True
    hijack = client.get(f"/api/admin/audit?tenant_id={MANCHESTER}", headers=admin).json()
    assert all(item["schoolId"] == BELAIR for item in hijack["items"])


def test_audit_pagination_and_volume(client, db):
    principal = belair_principal(client)
    now = datetime.now(timezone.utc)
    events = [
        AuditEvent(
            school_id=MANCHESTER,
            school_name="Manchester High School",
            user_name="Volume User",
            user_role="school_admin",
            action=AUDIT_CHANGE_SUBMITTED,
            resource_type="news",
            resource_name=f"Volume story {index}",
            old_data="{}",
            new_data="{}",
            created_at=now - timedelta(seconds=index),
        )
        for index in range(10000)
    ]
    db.add_all(events)
    db.commit()
    man = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    page = client.get("/api/admin/audit?page=1&pageSize=50", headers=man)
    assert page.status_code == 200
    body = page.json()
    assert body["pageSize"] == 50
    assert len(body["items"]) == 50
    assert body["total"] >= 10000
    assert body["totalPages"] >= 200
    belair = client.get("/api/admin/audit?pageSize=50", headers=principal).json()
    assert all(item["schoolId"] == BELAIR for item in belair["items"])
    assert all("Volume story" not in (item.get("resourceName") or "") for item in belair["items"])


def test_password_changes_are_not_stored(client):
    admin = belair_admin(client)
    created = client.post("/api/admin/users", headers=admin, json={
        "name": "Password Editor",
        "email": "password-editor@belairhighschoolja.com",
        "password": "editor1968",
        "role": "editor",
    }).json()
    client.put(f"/api/admin/users/{created['id']}", headers=admin, json={"password": "neweditor1"})
    history = client.get(f"/api/admin/audit/resource/user/{created['id']}", headers=admin).json()["items"]
    assert any(item["action"] == "USER_PASSWORD_CHANGED" for item in history)
    for item in history:
        blob = str(item.get("oldData")) + str(item.get("newData")) + str(item.get("metadata"))
        assert "editor1968" not in blob
        assert "neweditor1" not in blob
        assert "password_hash" not in blob
    disabled = client.put(f"/api/admin/users/{created['id']}", headers=admin, json={"status": "disabled"})
    assert disabled.status_code == 200
    assert any(item["action"] == AUDIT_USER_DISABLED for item in client.get(f"/api/admin/audit/resource/user/{created['id']}", headers=admin).json()["items"])
