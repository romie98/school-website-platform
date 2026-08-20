from __future__ import annotations

from fastapi import HTTPException, status

from app.models.school import School, SchoolSettings
from app.util.jsonutil import loads

THEME_PRESETS: dict[str, dict] = {
    "classic": {
        "id": "classic",
        "label": "Classic",
        "description": "Traditional school site with a strong header and gold accents.",
        "headingFont": "Montserrat",
        "bodyFont": "Inter",
        "heroStyle": "full-image",
        "navbarStyle": "classic",
        "newsLayout": "featured",
        "eventsLayout": "cards",
        "footerStyle": "classic",
        "radius": "0.5rem",
        "primaryColor": "#0B3D2E",
        "secondaryColor": "#FFD100",
        "accentColor": "#145C45",
    },
    "modern": {
        "id": "modern",
        "label": "Modern",
        "description": "Clean, spacious layout with rounded surfaces and contemporary type.",
        "headingFont": "Outfit",
        "bodyFont": "Inter",
        "heroStyle": "split",
        "navbarStyle": "modern",
        "newsLayout": "cards",
        "eventsLayout": "cards",
        "footerStyle": "modern",
        "radius": "1rem",
        "primaryColor": "#0F766E",
        "secondaryColor": "#F4D58D",
        "accentColor": "#115E59",
    },
    "academic": {
        "id": "academic",
        "label": "Academic",
        "description": "Serif headings and a formal, university-inspired tone.",
        "headingFont": "Merriweather",
        "bodyFont": "Source Sans 3",
        "heroStyle": "split",
        "navbarStyle": "classic",
        "newsLayout": "grid",
        "eventsLayout": "list",
        "footerStyle": "classic",
        "radius": "0.25rem",
        "primaryColor": "#1E3A5F",
        "secondaryColor": "#B42318",
        "accentColor": "#2B4C7E",
    },
    'heritage': {
        'id': 'heritage',
        'label': 'Heritage',
        'description': 'Editorial, crest-led presentation: serif headings, gold rules, and structured dark/cream sections.',
        'headingFont': 'Playfair Display',
        'bodyFont': 'Inter',
        'heroStyle': 'cinematic',
        'navbarStyle': 'heritage',
        'newsLayout': 'editorial',
        'eventsLayout': 'date-list',
        'footerStyle': 'heritage',
        'radius': '0.125rem',
        'primaryColor': '#241A00',
        'secondaryColor': '#FFD400',
        'accentColor': '#4A3500',
    },
    "minimal": {
        "id": "minimal",
        "label": "Minimal",
        "description": "Quiet type, flat colour, and generous whitespace.",
        "headingFont": "DM Sans",
        "bodyFont": "DM Sans",
        "heroStyle": "compact",
        "navbarStyle": "floating",
        "newsLayout": "list",
        "eventsLayout": "cards",
        "footerStyle": "minimal",
        "radius": "0.75rem",
        "primaryColor": "#123A73",
        "secondaryColor": "#C8102E",
        "accentColor": "#1D4E89",
    },
    "sky": {
        "id": "sky",
        "label": "Sky",
        "description": "Light navigation, cyan accents, and a modern campus look on white and soft blue.",
        "headingFont": "Outfit",
        "bodyFont": "Inter",
        "heroStyle": "spotlight",
        "navbarStyle": "light",
        "newsLayout": "featured",
        "eventsLayout": "list",
        "footerStyle": "structured",
        "radius": "0.75rem",
        "primaryColor": "#073B52",
        "secondaryColor": "#53C7E8",
        "accentColor": "#167EA5",
    },
}

ALLOWED_THEMES = set(THEME_PRESETS)
ALLOWED_FONTS = {
    "Montserrat",
    "Inter",
    "Outfit",
    "Merriweather",
    "Source Sans 3",
    "Playfair Display",
    "Lora",
    "DM Sans",
    "Cinzel",
    "Libre Baskerville",
}


def coerce_theme(name: str | None) -> str:
    value = (name or "classic").strip().lower()
    return value if value in ALLOWED_THEMES else "classic"


def validate_theme(name: str | None) -> str:
    value = (name or "classic").strip().lower()
    if value not in ALLOWED_THEMES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown theme")
    return value


def validate_font(name: str | None, fallback: str) -> str:
    value = (name or fallback).strip()
    if value not in ALLOWED_FONTS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported font")
    return value


def list_theme_presets() -> list[dict]:
    return list(THEME_PRESETS.values())


def apply_preset_defaults(settings: SchoolSettings, theme_id: str, *, reset_fonts: bool = True) -> None:
    preset = THEME_PRESETS[theme_id]
    settings.theme = theme_id
    if reset_fonts:
        settings.heading_font = preset["headingFont"]
        settings.body_font = preset["bodyFont"]
        settings.hero_style = preset["heroStyle"]
        settings.navbar_style = preset["navbarStyle"]
        settings.news_layout = preset["newsLayout"]
        settings.events_layout = preset["eventsLayout"]
        settings.footer_style = preset["footerStyle"]


def serialize_settings(school: School, settings: SchoolSettings | None) -> dict:
    contact = loads(settings.contact_json) if settings else {}
    branding = loads(settings.branding_json) if settings else {}
    return {
        "schoolName": settings.school_name if settings else school.name,
        "shortName": settings.short_name if settings else None,
        "motto": settings.motto if settings else None,
        "logoUrl": (settings.logo_url if settings else None) or school.logo_url,
        "faviconUrl": (settings.favicon_url if settings else None) or school.favicon_url,
        "principalName": settings.principal_name if settings else None,
        "address": settings.address if settings else None,
        "phone": settings.phone if settings else None,
        "email": settings.email if settings else None,
        "facebookUrl": settings.facebook_url if settings else None,
        "instagramUrl": settings.instagram_url if settings else None,
        "youtubeUrl": settings.youtube_url if settings else None,
        "tiktokUrl": settings.tiktok_url if settings else None,
        "headingFont": settings.heading_font if settings else "Montserrat",
        "bodyFont": settings.body_font if settings else "Inter",
        "theme": (settings.theme if settings else None) or school.theme,
        "contact": contact,
        "branding": branding,
    }


def build_theme(school: School, settings: SchoolSettings | None) -> dict:
    theme_id = coerce_theme((settings.theme if settings else None) or school.theme or "classic")
    preset = THEME_PRESETS[theme_id]
    return {
        "id": theme_id,
        "theme": theme_id,
        "label": preset["label"],
        "primaryColor": (settings.primary_color if settings else None) or school.primary_color,
        "secondaryColor": (settings.secondary_color if settings else None) or school.secondary_color,
        "accentColor": (settings.accent_color if settings else None) or school.accent_color,
        "headingFont": settings.heading_font if settings else preset["headingFont"],
        "bodyFont": settings.body_font if settings else preset["bodyFont"],
        "heroStyle": settings.hero_style if settings else preset["heroStyle"],
        "navbarStyle": settings.navbar_style if settings else preset["navbarStyle"],
        "newsLayout": settings.news_layout if settings else preset["newsLayout"],
        "eventsLayout": settings.events_layout if settings else preset["eventsLayout"],
        "footerStyle": settings.footer_style if settings else preset["footerStyle"],
        "radius": preset["radius"],
        "logoUrl": (settings.logo_url if settings else None) or school.logo_url,
        "faviconUrl": (settings.favicon_url if settings else None) or school.favicon_url,
    }


def sync_social_columns(settings: SchoolSettings, contact: dict) -> None:
    links = {item.get("platform", "").lower(): item.get("href") for item in contact.get("social") or [] if item.get("enabled")}
    settings.facebook_url = links.get("facebook") or settings.facebook_url
    settings.instagram_url = links.get("instagram") or settings.instagram_url
    settings.youtube_url = links.get("youtube") or settings.youtube_url
    settings.tiktok_url = links.get("tiktok") or settings.tiktok_url


def sync_contact_columns(settings: SchoolSettings, contact: dict) -> None:
    lines = contact.get("addressLines") or []
    if lines:
        settings.address = "\n".join(str(line) for line in lines if line)
    phones = contact.get("phone") or []
    if phones:
        settings.phone = str(phones[0])
    emails = contact.get("email") or []
    general = contact.get("generalEmail")
    if general:
        settings.email = str(general)
    elif emails:
        settings.email = str(emails[0])
    if contact.get("schoolName"):
        settings.school_name = contact["schoolName"]
    sync_social_columns(settings, contact)
