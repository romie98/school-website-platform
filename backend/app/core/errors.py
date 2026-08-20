from __future__ import annotations

from fastapi import HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.request_context import request_id_var
from app.core.sanitize import user_facing_message
from app.models.ops import (
    CATEGORY_AUTH,
    CATEGORY_DATABASE,
    CATEGORY_STORAGE,
    CATEGORY_UNKNOWN,
    CATEGORY_UPLOAD,
    SEVERITY_CRITICAL,
    SEVERITY_ERROR,
)


def classify_exception(exc: BaseException) -> str:
    if isinstance(exc, (OperationalError, DBAPIError, SQLAlchemyError)):
        return CATEGORY_DATABASE
    text = f"{type(exc).__name__} {exc}".lower()
    if "storage" in text or "disk" in text or isinstance(exc, OSError):
        return CATEGORY_STORAGE
    if "jwt" in text or "token" in text or "auth" in text:
        return CATEGORY_AUTH
    return CATEGORY_UNKNOWN


def request_id_of(request: Request | None = None) -> str:
    if request is not None:
        return getattr(request.state, "request_id", "") or request_id_var.get("")
    return request_id_var.get("")


async def unhandled_exception_handler(request: Request, exc: Exception):
    from app.services.system_events import record_event

    category = classify_exception(exc)
    request_id = request_id_of(request)
    record_event(
        event_type="UNHANDLED_EXCEPTION",
        message=user_facing_message(category),
        severity=SEVERITY_CRITICAL if category == CATEGORY_DATABASE else SEVERITY_ERROR,
        category=category,
        extra={"exceptionType": type(exc).__name__},
        request_id=request_id,
        route=request.url.path,
    )
    body = {
        "detail": {
            "message": user_facing_message(category),
            "requestId": request_id,
        }
    }
    return JSONResponse(body, status_code=500, headers={"X-Request-ID": request_id})


async def safe_http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = request_id_of(request)
    if exc.status_code >= 500:
        from app.services.system_events import record_event

        detail = exc.detail if isinstance(exc.detail, str) else user_facing_message(CATEGORY_UNKNOWN)
        category = CATEGORY_UPLOAD if "upload" in detail.lower() else CATEGORY_UNKNOWN
        record_event(
            event_type="HTTP_EXCEPTION",
            message=detail,
            severity=SEVERITY_ERROR,
            category=category,
            request_id=request_id,
            route=request.url.path,
        )
        if exc.status_code == 500:
            return JSONResponse(
                {"detail": {"message": user_facing_message(category, detail), "requestId": request_id}},
                status_code=exc.status_code,
                headers={"X-Request-ID": request_id},
            )
    response = await http_exception_handler(request, exc)
    response.headers["X-Request-ID"] = request_id
    return response


async def validation_handler(request: Request, exc: RequestValidationError):
    response = await request_validation_exception_handler(request, exc)
    response.headers["X-Request-ID"] = request_id_of(request)
    return response


def storage_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unable to upload image. Please try again.",
    )
