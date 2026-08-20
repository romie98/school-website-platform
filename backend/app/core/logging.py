from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.request_context import snapshot


class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        ctx = snapshot()
        record.request_id = ctx["request_id"]
        record.tenant_id = ctx["tenant_id"]
        record.user_id = ctx["user_id"]
        record.user_role = ctx["user_role"]
        record.route = ctx["route"]
        record.method = ctx["method"]
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "") or None,
            "tenant_id": getattr(record, "tenant_id", "") or None,
            "user_id": getattr(record, "user_id", "") or None,
            "user_role": getattr(record, "user_role", "") or None,
            "route": getattr(record, "route", "") or None,
            "method": getattr(record, "method", "") or None,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps({key: value for key, value in payload.items() if value is not None}, default=str)


def configure_logging() -> None:
    settings = get_settings()
    root = logging.getLogger()
    if getattr(root, "_platform_configured", False):
        return
    root.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(ContextFilter())
    if settings.use_json_logs:
        handler.setFormatter(JsonFormatter())
        level = logging.INFO
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s [req=%(request_id)s tenant=%(tenant_id)s] %(message)s")
        )
        level = logging.DEBUG if settings.is_development and not settings.is_test else logging.INFO
    if settings.is_test:
        level = logging.WARNING
    root.addHandler(handler)
    root.setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    root._platform_configured = True  # type: ignore[attr-defined]
