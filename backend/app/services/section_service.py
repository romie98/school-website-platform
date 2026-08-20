from fastapi import HTTPException, status

from app.models.content import HomepageSection
from app.models.user import new_id
from app.util.jsonutil import dumps, loads

SECTION_CATALOG: dict[str, dict] = {
    "hero": {"label": "Hero", "variants": ["full-image", "split", "slideshow", "compact", "cinematic", "spotlight"]},
    "identity": {"label": "Heritage strip", "variants": ["default", "gold"]},
    "quick_links": {"label": "Quick links", "variants": ["default", "panels", "compact"]},
    "announcement": {"label": "Announcements", "variants": ["banner", "cards"]},
    "welcome": {"label": "Welcome", "variants": ["default", "split"]},
    "principal": {"label": "Principal's message", "variants": ["default", "quote", "card", "editorial", "asymmetric"]},
    "news": {"label": "News", "variants": ["grid", "featured", "cards", "list", "editorial"]},
    "events": {"label": "Events", "variants": ["calendar", "cards", "timeline", "list", "date-list"]},
    "statistics": {"label": "Statistics", "variants": ["default", "light", "band"]},
    "academics": {"label": "Academics", "variants": ["default", "levels"]},
    "school-life": {"label": "School life", "variants": ["default", "split"]},
    "gallery": {"label": "Gallery", "variants": ["grid", "featured", "masonry"]},
    "staff": {"label": "Staff", "variants": ["grid", "featured"]},
    "cta": {"label": "Call to action", "variants": ["default", "split", "connect"]},
    "achievements": {"label": "Achievements", "variants": ["default"]},
    "motto": {"label": "Motto statement", "variants": ["default"]},
    "documents": {"label": "Documents", "variants": ["list", "cards"]},
    "contact": {"label": "Contact", "variants": ["default", "split"]},
}

ALIASES = {"principal_message": "principal"}


def normalize_type(value: str) -> str:
    return ALIASES.get(value, value)


def catalog_payload() -> list[dict]:
    return [{"id": key, **item} for key, item in SECTION_CATALOG.items()]


def serialize_section(row: HomepageSection) -> dict:
    section_type = normalize_type(row.section_type)
    meta = SECTION_CATALOG.get(section_type, {"label": section_type.replace("-", " ").title(), "variants": ["default"]})
    return {
        "id": row.id,
        "section_type": section_type,
        "label": meta["label"],
        "variant": row.variant or "default",
        "enabled": row.enabled,
        "position": row.position,
        "configuration": loads(row.configuration_json),
    }


def replace_sections(db, school_id: str, items: list[dict]) -> list[HomepageSection]:
    existing = {row.id: row for row in db.query(HomepageSection).filter(HomepageSection.school_id == school_id).all()}
    kept: set[str] = set()
    rows: list[HomepageSection] = []
    for index, item in enumerate(items):
        section_type = normalize_type(str(item.get("section_type") or ""))
        if section_type not in SECTION_CATALOG:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown section type: {section_type}")
        allowed = SECTION_CATALOG[section_type]["variants"]
        variant = item.get("variant") or allowed[0]
        if variant not in allowed and variant != "default":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown variant for {section_type}")
        row_id = item.get("id")
        row = existing.get(row_id) if row_id else None
        if row is None:
            row = HomepageSection(id=new_id(), school_id=school_id)
            db.add(row)
        row.section_type = section_type
        row.variant = variant
        row.enabled = bool(item.get("enabled", True))
        row.position = int(item.get("position", index))
        row.configuration_json = dumps(item.get("configuration") or {})
        kept.add(row.id)
        rows.append(row)
    for row_id, row in existing.items():
        if row_id not in kept:
            db.delete(row)
    return rows
