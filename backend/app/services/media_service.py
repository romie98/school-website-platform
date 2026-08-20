from pathlib import Path
from shutil import move

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.errors import storage_unavailable
from app.models.ops import CATEGORY_STORAGE, CATEGORY_UPLOAD, SEVERITY_ERROR
from app.services.system_events import record_event

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


def school_prefix(school_id: str, kind: str) -> Path:
    settings = get_settings()
    root = Path(settings.storage_dir).resolve() / "schools" / school_id / kind
    root.mkdir(parents=True, exist_ok=True)
    return root


def retire_file(storage_key: str) -> None:
    """Move a file out of public storage instead of permanently deleting it."""
    if not storage_key:
        return
    settings = get_settings()
    source = Path(settings.storage_dir).resolve() / storage_key
    if not source.exists() or not source.is_file():
        return
    from datetime import datetime, timezone

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


async def store_upload(school_id: str, kind: str, file: UploadFile, allowed: set[str]) -> dict:
    if file.content_type and file.content_type not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported file type")
    try:
        data = await file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is too large")
        filename = Path(file.filename or "upload").name
        dest = school_prefix(school_id, kind) / filename
        dest.write_bytes(data)
        storage_key = f"schools/{school_id}/{kind}/{filename}"
        return {
            "filename": filename,
            "storage_key": storage_key,
            "url": f"/api/public/media/{storage_key}",
            "mime_type": file.content_type or "application/octet-stream",
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
            extra={"fileType": file.content_type, "filename": Path(file.filename or "upload").name, "fileSize": getattr(file, "size", None)},
        )
        raise storage_unavailable() from None
