from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3

from app.core.config import get_settings
from app.models.ops import BACKUP_FAILED, BACKUP_SUCCESS, BackupRun
from app.seed import BELAIR, MANCHESTER
from app.services.backup_service import backup_health, create_backup, restore_backup


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def platform(client):
    return login(client, "platform@schoolplatform.com", "platform1968")


def test_public_health_is_minimal(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy"
    assert "database_url" not in str(body).lower()
    assert "secret" not in str(body).lower()


def test_ready_healthy(client):
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["database"] == "healthy"
    assert body["storage"] == "healthy"
    assert body["status"] == "healthy"


def test_ready_database_unhealthy(client, monkeypatch):
    monkeypatch.setattr("app.api.health.check_database", lambda: {"status": "UNHEALTHY"})
    res = client.get("/api/health/ready")
    assert res.status_code == 503
    body = res.json()
    assert body["database"] == "unhealthy"
    assert "postgres" not in str(body).lower()
    assert body["status"] == "unhealthy"


def test_ready_storage_unhealthy_is_degraded(client, monkeypatch):
    monkeypatch.setattr("app.api.health.check_storage", lambda: {"status": "UNHEALTHY"})
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["storage"] == "unhealthy"
    assert body["status"] == "degraded"
    assert body["database"] == "healthy"


def test_health_adds_request_id(client):
    res = client.get("/api/health")
    assert res.headers.get("x-request-id")


def test_school_admin_cannot_see_system_status(client):
    token = login(client, "admin@belairhighschoolja.com", "belair1968")
    assert client.get("/api/platform/system", headers=token).status_code == 403
    assert client.get("/api/platform/system/events", headers=token).status_code == 403


def test_super_admin_system_status(client):
    res = client.get("/api/platform/system", headers=platform(client))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["services"]["database"] == "HEALTHY"
    assert body["services"]["storage"] == "HEALTHY"
    assert body["environment"] == "test"


def test_backup_success_recorded(client, db, tmp_path, monkeypatch):
    settings = get_settings()
    source_db = tmp_path / "source.db"
    source_db.write_bytes(b"sqlite-bytes")
    storage = tmp_path / "storage" / "schools" / BELAIR / "uploads"
    storage.mkdir(parents=True)
    (storage / "logo.png").write_bytes(b"img")
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "media_trash_dir", str(tmp_path / "trash"))
    monkeypatch.setattr(settings, "environment", "backup-success")
    monkeypatch.setattr("app.services.backup_service.sqlite_file", lambda *a, **k: source_db)
    run = create_backup(db)
    assert run.status == BACKUP_SUCCESS
    assert (Path(run.location) / "database.db").read_bytes() == b"sqlite-bytes"
    assert (Path(run.location) / "media" / "schools" / BELAIR / "uploads" / "logo.png").exists()
    health = backup_health(db)
    assert health["status"] == "HEALTHY"
    assert health["lastSuccess"]["id"] == run.id


def test_backup_failure_visible(client, db, tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    monkeypatch.setattr(settings, "environment", "backup-fail")
    monkeypatch.setattr("app.services.backup_service.sqlite_file", lambda *a, **k: tmp_path / "missing.db")
    try:
        create_backup(db)
        assert False, "expected failure"
    except Exception:
        pass
    row = db.query(BackupRun).filter(BackupRun.environment == "backup-fail").order_by(BackupRun.started_at.desc()).first()
    assert row.status == BACKUP_FAILED
    health = backup_health(db)
    assert health["status"] == "UNHEALTHY"
    events = client.get("/api/platform/system/events", headers=platform(client)).json()["items"]
    assert any(item["eventType"] == "BACKUP_FAILED" for item in events)


def test_backup_overdue(db, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "backup-overdue")
    now = datetime.now(timezone.utc)
    db.add(
        BackupRun(
            backup_type="full",
            environment="backup-overdue",
            status=BACKUP_SUCCESS,
            started_at=now - timedelta(days=3),
            completed_at=now - timedelta(days=3),
            location="/tmp/old",
            provider="local",
        )
    )
    db.commit()
    health = backup_health(db)
    assert health["status"] == "DEGRADED"


def test_restore_keeps_tenant_media_separate(db, tmp_path, monkeypatch):
    settings = get_settings()
    source_db = tmp_path / "source.db"
    source_db.write_bytes(b"db")
    belair = tmp_path / "storage" / "schools" / BELAIR / "uploads"
    man = tmp_path / "storage" / "schools" / MANCHESTER / "uploads"
    belair.mkdir(parents=True)
    man.mkdir(parents=True)
    (belair / "a.png").write_text("belair")
    (man / "b.png").write_text("manchester")
    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "media_trash_dir", str(tmp_path / "trash"))
    monkeypatch.setattr(settings, "environment", "backup-restore")
    monkeypatch.setattr("app.services.backup_service.sqlite_file", lambda *a, **k: source_db)
    run = create_backup(db)
    (belair / "a.png").write_text("changed")
    (man / "b.png").unlink()
    restored_db = tmp_path / "restored.db"
    restored_media = tmp_path / "restored-media"
    monkeypatch.setattr("app.services.backup_service.sqlite_file", lambda *a, **k: restored_db)
    restore_backup(run.location, storage_dir=str(restored_media))
    assert (restored_media / "schools" / BELAIR / "uploads" / "a.png").read_text() == "belair"
    assert (restored_media / "schools" / MANCHESTER / "uploads" / "b.png").read_text() == "manchester"
    assert restored_db.exists()


def test_backup_archive_keeps_tenant_rows(db, tmp_path, monkeypatch):
    settings = get_settings()
    from app.db.session import engine

    monkeypatch.setattr(settings, "backup_dir", str(tmp_path / "backups"))
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "media_trash_dir", str(tmp_path / "trash"))
    monkeypatch.setattr(settings, "environment", "backup-tenants")
    live_db = Path(engine.url.database).resolve()
    monkeypatch.setattr("app.services.backup_service.sqlite_file", lambda *a, **k: live_db)
    run = create_backup(db)
    conn = sqlite3.connect(Path(run.location) / "database.db")
    try:
        rows = conn.execute("select school_id, slug from news_articles").fetchall()
        belair = {slug for school_id, slug in rows if school_id == BELAIR}
        manchester = {slug for school_id, slug in rows if school_id == MANCHESTER}
        assert belair
        assert manchester
        emails = conn.execute("select school_id, email from users where school_id is not null").fetchall()
        assert any(school_id == BELAIR and "belair" in email for school_id, email in emails)
        assert any(school_id == MANCHESTER and "manchester" in email for school_id, email in emails)
    finally:
        conn.close()
