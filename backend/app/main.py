from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.admin.approvals import router as approvals_router
from app.api.admin.audit import router as audit_router
from app.api.admin.resources import router as admin_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.platform.schools import router as platform_router
from app.api.platform.system import ops_router, router as platform_system_router
from app.api.public.media import router as public_media_router
from app.api.public.site import router as public_router
from app.core.config import get_settings
from app.core.errors import safe_http_exception_handler, unhandled_exception_handler, validation_handler
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware

settings = get_settings()
configure_logging()
if settings.sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment, send_default_pii=False)
    except ImportError:
        import logging

        logging.getLogger(__name__).warning("SENTRY_DSN is set but sentry-sdk is not installed")
Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
Path(settings.media_trash_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="School Website Platform", version="0.1.0")
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

app.add_exception_handler(Exception, unhandled_exception_handler)
app.add_exception_handler(StarletteHTTPException, safe_http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_handler)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(public_router)
app.include_router(admin_router)
app.include_router(approvals_router)
app.include_router(audit_router)
app.include_router(platform_router)
app.include_router(platform_system_router)
app.include_router(ops_router)
if (settings.storage_provider or "local").strip().lower() == "r2":
    app.include_router(public_media_router)
else:
    app.mount("/api/public/media", StaticFiles(directory=settings.storage_dir), name="media")
