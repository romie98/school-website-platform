import asyncio
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.datastructures import Headers, UploadFile

from app.core.config import get_settings
from app.models.ops import SystemEvent
from app.seed import BELAIR, MANCHESTER
from app.services.health_service import check_storage
from app.services.media_service import (
    ALLOWED_IMAGE,
    is_public_media_key,
    retire_file,
    store_upload,
)
from app.api.public.media import router as public_media_router


class FakeBody:
    def __init__(self, data: bytes):
        self.data = data

    def iter_chunks(self):
        yield self.data


class FakeClientError(Exception):
    def __init__(self, code: str):
        self.response = {"Error": {"Code": code, "Message": "missing"}}


class FakeS3:
    def __init__(self):
        self.puts: list[dict] = []
        self.copies: list[dict] = []
        self.deletes: list[dict] = []
        self.objects: dict[str, dict] = {}

    def put_object(self, **kwargs):
        self.puts.append(kwargs)
        self.objects[kwargs["Key"]] = kwargs

    def copy_object(self, **kwargs):
        self.copies.append(kwargs)

    def delete_object(self, **kwargs):
        self.deletes.append(kwargs)

    def get_object(self, **kwargs):
        key = kwargs["Key"]
        if key not in self.objects:
            raise FakeClientError("NoSuchKey")
        item = self.objects[key]
        return {"Body": FakeBody(item["Body"]), "ContentType": item.get("ContentType")}

    def head_bucket(self, **kwargs):
        return {}


class CopyFailS3:
    def __init__(self):
        self.deletes: list[dict] = []

    def copy_object(self, **kwargs):
        raise RuntimeError("copy failed")

    def delete_object(self, **kwargs):
        self.deletes.append(kwargs)


def configure_r2(monkeypatch, **overrides):
    settings = get_settings()
    values = {
        "storage_provider": "r2",
        "storage_bucket": "school-platform-staging",
        "r2_endpoint": "https://r2.example",
        "r2_access_key_id": "id",
        "r2_secret_access_key": "secret",
    }
    values.update(overrides)
    for key, value in values.items():
        monkeypatch.setattr(settings, key, value)
    return settings


def make_file(name="photo.jpg", body=b"hello-image", content_type="image/jpeg"):
    return UploadFile(file=BytesIO(body), filename=name, headers=Headers({"content-type": content_type}))


def store(file, school_id=BELAIR, kind="news"):
    return asyncio.run(store_upload(school_id, kind, file, ALLOWED_IMAGE))


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def media_app_client():
    app = FastAPI()
    app.include_router(public_media_router)
    return TestClient(app)


def test_local_upload_still_works(client, tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "storage_provider", "local")
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path))
    monkeypatch.setattr(settings, "r2_endpoint", "")
    monkeypatch.setattr(settings, "r2_access_key_id", "")
    monkeypatch.setattr(settings, "r2_secret_access_key", "")
    token = login(client, "admin@belairhighschoolja.com", "belair1968")
    res = client.post(
        "/api/admin/media",
        headers=token,
        files={"file": ("campus.png", BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 20), "image/png")},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "campus.png"
    assert body["url"].startswith("/api/public/media/schools/")
    key = body["url"].removeprefix("/api/public/media/")
    assert (tmp_path / key).is_file()
    assert key.startswith(f"schools/{BELAIR}/")


def test_r2_upload_uses_unique_key_and_public_url(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    stored = store(make_file("photo.jpg", b"jpeg-bytes", "image/jpeg"), kind="news")
    assert len(fake.puts) == 1
    put = fake.puts[0]
    assert put["Bucket"] == "school-platform-staging"
    assert put["ContentType"] == "image/jpeg"
    assert put["Body"] == b"jpeg-bytes"
    assert put["Key"] == stored["storage_key"]
    assert stored["filename"] == "photo.jpg"
    assert stored["storage_key"].startswith(f"schools/{BELAIR}/news/")
    assert stored["storage_key"].endswith(".jpg")
    assert stored["storage_key"] != f"schools/{BELAIR}/news/photo.jpg"
    assert stored["url"] == f"/api/public/media/{stored['storage_key']}"


def test_same_filename_twice_produces_different_keys(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    first = store(make_file("photo.jpg"))
    second = store(make_file("photo.jpg"))
    assert first["filename"] == second["filename"] == "photo.jpg"
    assert first["storage_key"] != second["storage_key"]


def test_r2_public_read_streams_object(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    fake.objects["schools/11111111-1111-1111-1111-111111111111/news/abc.jpg"] = {
        "Body": b"image-bytes",
        "ContentType": "image/jpeg",
    }
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    res = media_app_client().get("/api/public/media/schools/11111111-1111-1111-1111-111111111111/news/abc.jpg")
    assert res.status_code == 200
    assert res.content == b"image-bytes"
    assert res.headers["content-type"].startswith("image/jpeg")
    assert res.headers["cache-control"] == "public, max-age=3600"


def test_missing_r2_object_returns_404(monkeypatch):
    configure_r2(monkeypatch)
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: FakeS3())
    res = media_app_client().get("/api/public/media/schools/11111111-1111-1111-1111-111111111111/news/missing.jpg")
    assert res.status_code == 404
    assert "r2" not in res.text.lower()
    assert "secret" not in res.text.lower()
    assert "cache-control" not in {k.lower() for k in res.headers.keys()} or "max-age" not in res.headers.get("cache-control", "")


def test_traversal_and_trash_keys_are_rejected(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    client = media_app_client()
    for key in ("../secret", "/etc/passwd", "trash/file.jpg", "schools/../secret", "schools//x/y.jpg"):
        assert is_public_media_key(key.lstrip("/")) is False or key.startswith("/") or ".." in key
        res = client.get(f"/api/public/media/{key}")
        assert res.status_code == 404, key
        assert fake.puts == []


def test_public_key_must_be_school_scoped():
    assert is_public_media_key(f"schools/{BELAIR}/news/abc.jpg") is True
    assert is_public_media_key("trash/20260822/schools/x/news/abc.jpg") is False
    assert is_public_media_key("etc/passwd") is False


def test_retire_copies_to_dated_trash_then_deletes(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    key = f"schools/{BELAIR}/news/abc123.jpg"
    retire_file(key)
    assert len(fake.copies) == 1
    assert fake.copies[0]["Bucket"] == "school-platform-staging"
    assert fake.copies[0]["CopySource"] == {"Bucket": "school-platform-staging", "Key": key}
    dest = fake.copies[0]["Key"]
    assert dest.startswith("trash/")
    assert dest.endswith(key)
    assert fake.deletes == [{"Bucket": "school-platform-staging", "Key": key}]


def test_failed_copy_does_not_delete_original(monkeypatch, db):
    configure_r2(monkeypatch)
    fake = CopyFailS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    retire_file(f"schools/{BELAIR}/news/keep.jpg")
    assert fake.deletes == []
    db.expire_all()
    assert db.query(SystemEvent).filter(SystemEvent.event_type == "STORAGE_RETIRE_FAILURE").first()


def test_r2_keys_remain_tenant_scoped(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    belair = store(make_file("a.jpg"), school_id=BELAIR, kind="staff")
    man = store(make_file("a.jpg"), school_id=MANCHESTER, kind="staff")
    assert belair["storage_key"].startswith(f"schools/{BELAIR}/staff/")
    assert man["storage_key"].startswith(f"schools/{MANCHESTER}/staff/")
    assert BELAIR not in man["storage_key"]
    assert MANCHESTER not in belair["storage_key"]


def test_local_provider_does_not_require_r2_credentials(tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "storage_provider", "local")
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path))
    monkeypatch.setattr(settings, "r2_endpoint", "")
    monkeypatch.setattr(settings, "r2_access_key_id", "")
    monkeypatch.setattr(settings, "r2_secret_access_key", "")
    monkeypatch.setattr(settings, "storage_bucket", "")
    stored = store(make_file("crest.webp", b"webp", "image/webp"), kind="gallery")
    assert stored["filename"] == "crest.webp"
    assert (tmp_path / stored["storage_key"]).read_bytes() == b"webp"
    assert stored["url"].startswith("/api/public/media/schools/")


def test_incomplete_r2_config_is_unavailable(monkeypatch, db):
    configure_r2(monkeypatch, r2_secret_access_key="")
    try:
        store(make_file())
        raise AssertionError("expected storage unavailable")
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 503
    db.expire_all()
    assert db.query(SystemEvent).filter(SystemEvent.event_type == "STORAGE_CONFIG_INVALID").first()


def test_r2_health_check_uses_head_bucket(monkeypatch):
    configure_r2(monkeypatch)
    fake = FakeS3()
    monkeypatch.setattr("app.services.media_service._r2_client", lambda: fake)
    assert check_storage()["status"] == "HEALTHY"


def test_r2_health_check_unhealthy_when_unreachable(monkeypatch):
    configure_r2(monkeypatch)

    class Down:
        def head_bucket(self, **kwargs):
            raise RuntimeError("timeout")

    monkeypatch.setattr("app.services.media_service._r2_client", lambda: Down())
    assert check_storage()["status"] == "UNHEALTHY"


def test_local_health_does_not_need_r2(tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "storage_provider", "local")
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path))
    monkeypatch.setattr(settings, "r2_endpoint", "")
    assert check_storage()["status"] == "HEALTHY"
    assert (Path(tmp_path) / ".healthcheck").exists()
