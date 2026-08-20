"""Strip secrets and internal details from messages shown in APIs and dashboards."""

from __future__ import annotations

import re
from typing import Any

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "passwordhash",
    "token",
    "access_token",
    "accesstoken",
    "refresh_token",
    "refreshtoken",
    "secret",
    "secret_key",
    "apikey",
    "api_key",
    "authorization",
    "cookie",
    "session",
    "session_token",
    "database_url",
    "dsn",
}

_SECRET_PATTERNS = [
    re.compile(r"(?i)(password|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+"),
    re.compile(r"(?i)(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://\S+"),
    re.compile(r"(?i)sqlite:////?\S+"),
    re.compile(r"(?i)bearer\s+[a-z0-9._\-]+"),
    re.compile(r"(?i)eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+"),
]

_PATH_HINT = re.compile(r"(?i)([a-z]:\\|/(?:users|home|var|opt|app)/)\S+")


def sanitize_text(value: str, *, keep_paths: bool = False) -> str:
    text = value or ""
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub("[redacted]", text)
    if not keep_paths:
        text = _PATH_HINT.sub("[path]", text)
    return text[:2000]


def sanitize_value(value: Any, depth: int = 0) -> Any:
    if depth > 6:
        return None
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower().replace("-", "_")
            if lowered in SENSITIVE_KEYS or "secret" in lowered or lowered.endswith("_key"):
                continue
            cleaned[key] = sanitize_value(item, depth + 1)
        return cleaned
    if isinstance(value, list):
        return [sanitize_value(item, depth + 1) for item in value[:40]]
    if isinstance(value, str):
        return sanitize_text(value)
    return value


def user_facing_message(category: str | None = None, fallback: str | None = None) -> str:
    if category == "UPLOAD" or category == "STORAGE":
        return "Unable to upload image. Please try again."
    if category == "DATABASE":
        return "We're temporarily unable to load this content. Please try again shortly."
    if fallback:
        return sanitize_text(fallback)
    return "Something went wrong. Please try again shortly."
