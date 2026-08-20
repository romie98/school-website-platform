import json
from datetime import datetime, timezone


def dumps(value) -> str:
    return json.dumps(value, default=str)


def loads(raw: str | None, fallback=None):
    if not raw:
        return {} if fallback is None else fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {} if fallback is None else fallback


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
