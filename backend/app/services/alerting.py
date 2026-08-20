"""Optional ops alerts. School users never receive infrastructure alerts."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.core.sanitize import sanitize_text, sanitize_value
from app.models.ops import SEVERITY_CRITICAL, SEVERITY_ERROR

log = logging.getLogger(__name__)


def notify_ops(*, severity: str, title: str, message: str, extra: dict[str, Any] | None = None) -> None:
    if severity not in {SEVERITY_ERROR, SEVERITY_CRITICAL}:
        return
    settings = get_settings()
    if settings.is_test:
        return
    webhook = (settings.ops_alert_webhook or "").strip()
    if not webhook:
        log.critical("%s: %s", title, sanitize_text(message))
        return
    try:
        import httpx

        httpx.post(
            webhook,
            json={
                "severity": severity,
                "title": title,
                "message": sanitize_text(message),
                "environment": settings.environment,
                "extra": sanitize_value(extra or {}),
            },
            timeout=1.5,
        )
    except Exception:
        log.warning("Ops alert webhook failed", exc_info=True)
