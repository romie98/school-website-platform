from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse

from app.core.config import get_settings
from app.services import media_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public", tags=["public-media"])
CACHE_CONTROL = "public, max-age=3600"


def _iter_body(body):
    if hasattr(body, "iter_chunks"):
        yield from body.iter_chunks()
        return
    chunk = body.read() if hasattr(body, "read") else body
    if chunk:
        yield chunk


def _stream_r2(storage_key: str) -> StreamingResponse:
    settings = get_settings()
    try:
        client = media_service._r2_client()
        obj = client.get_object(Bucket=settings.storage_bucket, Key=storage_key)
    except HTTPException:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found") from None
    except Exception as exc:
        error_code = ""
        response = getattr(exc, "response", None)
        if isinstance(response, dict):
            error_code = str((response.get("Error") or {}).get("Code") or "")
        if error_code not in {"NoSuchKey", "404", "NotFound"}:
            log.error("R2 media read failed", extra={"code": error_code or "unknown"})
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found") from None
    return StreamingResponse(
        _iter_body(obj["Body"]),
        media_type=obj.get("ContentType") or "application/octet-stream",
        headers={"Cache-Control": CACHE_CONTROL},
    )


def _local_file(storage_key: str) -> FileResponse:
    settings = get_settings()
    root = Path(settings.storage_dir).resolve()
    path = (root / storage_key).resolve()
    try:
        path.relative_to(root)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found") from None
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return FileResponse(path, headers={"Cache-Control": CACHE_CONTROL})


@router.get("/media/{storage_key:path}")
def public_media(storage_key: str):
    if not media_service.is_public_media_key(storage_key):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if media_service.uses_r2():
        return _stream_r2(storage_key)
    return _local_file(storage_key)
