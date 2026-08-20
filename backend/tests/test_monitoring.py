from io import BytesIO

from app.models.ops import SystemEvent
from app.seed import BELAIR, MANCHESTER
from app.services.audit_service import log_event


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def platform(client):
    return login(client, "platform@schoolplatform.com", "platform1968")


def test_unhandled_500_is_sanitized(client):
    from fastapi.testclient import TestClient
    from app.main import app

    @app.get("/api/__test_boom")
    def boom():
        raise RuntimeError("postgres://user:secret@db-host/school")

    with TestClient(app, raise_server_exceptions=False) as isolated:
        res = isolated.get("/api/__test_boom")
        assert res.status_code == 500
        body = res.json()
        text = str(body).lower()
        assert "secret" not in text
        assert "postgres://" not in text
        assert "requestId" in body["detail"] or res.headers.get("x-request-id")
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    assert any(item["eventType"] == "UNHANDLED_EXCEPTION" for item in events)


def test_upload_failure_records_tenant(client, monkeypatch):
    def explode(school_id, kind):
        raise OSError("storage unavailable")

    monkeypatch.setattr("app.services.media_service.school_prefix", explode)
    token = login(client, "admin@belairhighschoolja.com", "belair1968")
    res = client.post(
        "/api/admin/media",
        headers=token,
        files={"file": ("photo.png", BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 20), "image/png")},
    )
    assert res.status_code == 503
    assert res.json()["detail"] == "Unable to upload image. Please try again."
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    upload = next(item for item in events if item["eventType"] == "UPLOAD_FAILURE")
    assert upload["tenantId"] == BELAIR
    assert upload["category"] == "UPLOAD"


def test_upload_failure_records_other_tenant(client, monkeypatch):
    monkeypatch.setattr("app.services.media_service.school_prefix", lambda *a, **k: (_ for _ in ()).throw(OSError("down")))
    token = login(client, "admin@manchesterhigh.edu.jm", "manchester1968")
    res = client.post(
        "/api/admin/media",
        headers=token,
        files={"file": ("photo.png", BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 20), "image/png")},
    )
    assert res.status_code == 503
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    upload = next(item for item in events if item["eventType"] == "UPLOAD_FAILURE" and item["tenantId"] == MANCHESTER)
    assert upload["tenantId"] == MANCHESTER
    belair = login(client, "admin@belairhighschoolja.com", "belair1968")
    assert client.get("/api/platform/system/events", headers=belair).status_code == 403


def test_approval_publish_failure_records_system_event(client, monkeypatch):
    monkeypatch.setattr(
        "app.services.approval_service._apply_for_school",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("publish boom")),
    )
    principal = login(client, "principal@belairhighschoolja.com", "belair1968")
    submitted = client.post("/api/admin/news", headers=login(client, "admin@belairhighschoolja.com", "belair1968"), json={
        "title": "Ops test",
        "slug": "ops-test-news-monitoring",
        "status": "published",
        "content": "y",
    })
    assert submitted.status_code == 200, submitted.text
    change_id = submitted.json()["change"]["id"]
    res = client.post(f"/api/admin/changes/{change_id}/approve", headers=principal)
    assert res.status_code == 409
    assert "postgres" not in res.text.lower()
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    assert any(item["eventType"] == "APPROVAL_PUBLISH_FAILURE" and item["tenantId"] == BELAIR for item in events)


def test_audit_write_failure_records_system_event(db):
    from app.db.session import SessionLocal

    class Boom:
        def get(self, *a, **k):
            return None

        def add(self, obj):
            raise RuntimeError("audit down")

        def flush(self):
            return None

    try:
        log_event(Boom(), action="CONTENT_PUBLISHED", resource_type="news")
        assert False, "expected failure"
    except RuntimeError:
        pass
    session = SessionLocal()
    try:
        row = session.query(SystemEvent).filter(SystemEvent.event_type == "AUDIT_WRITE_FAILURE").first()
        assert row is not None
    finally:
        session.close()


def test_failed_login_is_not_a_system_outage(client):
    res = client.post("/api/auth/login", json={"username": "nobody@school.edu", "password": "wrong"})
    assert res.status_code == 401
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    assert not any(item["route"] == "/api/auth/login" and item["eventType"] == "UNHANDLED_EXCEPTION" for item in events)


def test_auth_failure_spike_warning(client):
    for _ in range(8):
        client.post("/api/auth/login", json={"username": "spike@school.edu", "password": "wrong"})
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    assert any(item["eventType"] == "AUTH_FAILURE_SPIKE" for item in events)
