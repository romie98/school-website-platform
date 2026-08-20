import json

DEFAULT_FEATURES = {
    "news": True,
    "events": True,
    "gallery": True,
    "documents": True,
    "online_admissions": False,
    "student_portal": False,
    "analytics": True,
}


def parse_flags(raw: str | None) -> dict:
    try:
        data = json.loads(raw or "{}")
    except json.JSONDecodeError:
        data = {}
    return {**DEFAULT_FEATURES, **data}


def feature_enabled(flags: dict, name: str) -> bool:
    return bool(flags.get(name, False))
