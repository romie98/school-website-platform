from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from shutil import move

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.errors import storage_unavailable
from app.models.ops import CATEGORY_STORAGE, CATEGORY_UPLOAD, SEVERITY_ERROR
from app.services.system_events import record_event

log = logging.getLogger(__name__)

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/jpg", "image/svg+xml"}
ALLOWED_DOCS = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}
MAX_BYTES = 10 * 1024 * 1024
SAFE_KIND = re.compile(r"^[A-Za-z0-9_-]+$")
SAFE_SUFFIX = re.compile(r"^\.[A-Za-z0-9]{1,8}$")


def uses_r2() -> bool:
    return (get_settings().storage_provider or "local").strip().lower() == "r2"


def r2_configured() -> bool:
    settings = get_settings()
    return all(
        [
            (settings.r2_endpoint or "").strip(),
            (settings.r2_access_key_id or "").strip(),
            (settings.r2_secret_access_key or "").strip(),
            (settings.storage_bucket or "").strip(),
        ]
    )


def safe_kind(kind: str) -> str:
    value = Path(kind or "uploads").name
    if not value or not SAFE_KIND.fullmatch(value):
        return "uploads"
    return value


def original_filename(name: str | None) -> str:
    return Path(name or "upload").name or "upload"


def object_suffix(filename: str) -> str:
    suffix = Path(filename).suffix
    return suffix.lower() if suffix and SAFE_SUFFIX.fullmatch(suffix) else ""


def object_key(school_id: str, kind: str, filename: str) -> str:
    return f"schools/{school_id}/{safe_kind(kind)}/{uuid.uuid4().hex}{object_suffix(filename)}"


def is_public_media_key(storage_key: str) -> bool:
    if not storage_key or "\\" in storage_key or ".." in storage_key or storage_key.startswith("/"):
        return False
    if storage_key.startswith("trash/") or storage_key.startswith("trash\\"):
        return False
    parts = storage_key.split("/")
    if any(part == "" for part in parts):
        return False
    return len(parts) >= 3 and parts[0] == "schools"


def _r2_unavailable() -> None:
    record_event(
        event_type="STORAGE_CONFIG_INVALID",
        message="Object storage is not configured",
        severity=SEVERITY_ERROR,
        category=CATEGORY_STORAGE,
    )
    raise storage_unavailable() from None


def _r2_client():
    settings = get_settings()
    if not r2_configured():
        _r2_unavailable()
    try:
        import boto3
    except ImportError:
        _r2_unavailable()
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def school_prefix(school_id: str, kind: str) -> Path:
    settings = get_settings()
    root = Path(settings.storage_dir).resolve() / "schools" / school_id / safe_kind(kind)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _local_source(storage_key: str) -> Path | None:
    settings = get_settings()
    root = Path(settings.storage_dir).resolve()
    source = (root / storage_key).resolve()
    try:
        source.relative_to(root)
    except ValueError:
        return None
    if not source.exists() or not source.is_file():
        return None
    return source


def _retire_r2(storage_key: str) -> None:
    settings = get_settings()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    dest = f"trash/{stamp}/{storage_key}"
    try:
        client = _r2_client()
        client.copy_object(
            Bucket=settings.storage_bucket,
            CopySource={"Bucket": settings.storage_bucket, "Key": storage_key},
            Key=dest,
        )
        client.delete_object(Bucket=settings.storage_bucket, Key=storage_key)
    except HTTPException:
        record_event(
            event_type="STORAGE_RETIRE_FAILURE",
            message="Unable to move deleted media into recoverable trash",
            severity=SEVERITY_ERROR,
            category=CATEGORY_STORAGE,
            extra={"key": storage_key.split("/")[-1]},
        )
    except Exception:
        log.error("R2 retire failed", exc_info=True)
        record_event(
            event_type="STORAGE_RETIRE_FAILURE",
            message="Unable to move deleted media into recoverable trash",
            severity=SEVERITY_ERROR,
            category=CATEGORY_STORAGE,
            extra={"key": storage_key.split("/")[-1]},
        )


def retire_file(storage_key: str) -> None:
    """Move a file out of public storage instead of permanently deleting it."""
    if not storage_key:
        return
    if uses_r2():
        _retire_r2(storage_key)
        return
    source = _local_source(storage_key)
    if source is None:
        return
    settings = get_settings()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    dest = Path(settings.media_trash_dir).resolve() / stamp / storage_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        move(str(source), str(dest))
    except OSError:
        record_event(
            event_type="STORAGE_RETIRE_FAILURE",
            message="Unable to move deleted media into recoverable trash",
            severity=SEVERITY_ERROR,
            category=CATEGORY_STORAGE,
            extra={"filename": source.name},
        )


def _store_r2(storage_key: str, data: bytes, content_type: str) -> None:
    settings = get_settings()
    client = _r2_client()
    client.put_object(
        Bucket=settings.storage_bucket,
        Key=storage_key,
        Body=data,
        ContentType=content_type,
    )


async def store_upload(school_id: str, kind: str, file: UploadFile, allowed: set[str]) -> dict:
    if file.content_type and file.content_type not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported file type")
    filename = original_filename(file.filename)
    try:
        data = await file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is too large")
        content_type = file.content_type or "application/octet-stream"
        storage_key = object_key(school_id, kind, filename)
        if uses_r2():
            _store_r2(storage_key, data, content_type)
        else:
            dest = school_prefix(school_id, kind) / Path(storage_key).name
            dest.write_bytes(data)
        return {
            "filename": filename,
            "storage_key": storage_key,
            "url": f"/api/public/media/{storage_key}",
            "mime_type": content_type,
            "size": len(data),
        }
    except HTTPException:
        raise
    except Exception:
        record_event(
            event_type="UPLOAD_FAILURE",
            message="Unable to upload image. Please try again.",
            severity=SEVERITY_ERROR,
            category=CATEGORY_UPLOAD,
            tenant_id=school_id,
            extra={"fileType": file.content_type, "filename": filename, "fileSize": getattr(file, "size", None)},
        )
        raise storage_unavailable() from None
