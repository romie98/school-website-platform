from app.models.content import (
    Announcement,
    Department,
    Document,
    Event,
    GalleryAlbum,
    HomepageSection,
    MediaAsset,
    NewsArticle,
    Page,
    StaffMember,
)
from app.models.school import School, SchoolSettings
from app.services.feature_service import parse_flags
from app.services.section_service import serialize_section
from app.services.theme_service import build_theme, serialize_settings
from app.util.jsonutil import loads


DEFAULT_NAV = [
    {"label": "Home", "href": "/"},
    {
        "label": "About",
        "href": "/about",
        "children": [
            {"label": "School Overview", "href": "/about"},
            {"label": "Principal's Message", "href": "/about/principal"},
            {"label": "Administration", "href": "/about/administration"},
            {"label": "Staff Directory", "href": "/about/staff"},
        ],
    },
    {"label": "Academics", "href": "/academics"},
    {"label": "Admissions", "href": "/admissions"},
    {"label": "News", "href": "/news"},
    {"label": "Events", "href": "/events"},
    {"label": "Gallery", "href": "/gallery"},
    {"label": "Contact", "href": "/contact"},
]


def news_to_public(row: NewsArticle) -> dict:
    extra = loads(row.payload)
    return {
        "id": row.id,
        "slug": row.slug,
        "title": row.title,
        "excerpt": row.excerpt,
        "content": row.content,
        "category": row.category,
        "author": row.author,
        "image": row.image,
        "imageAlt": row.image_alt,
        "gallery": extra.get("gallery", []),
        "status": row.status,
        "isFeatured": row.is_featured,
        "showOnHomepage": row.show_on_homepage,
        "featuredPriority": row.featured_priority,
        "date": row.date,
        "publishedAt": row.published_at,
        "createdAt": row.created_at.isoformat() if row.created_at else row.date,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else row.date,
        **{k: v for k, v in extra.items() if k not in {"gallery"}},
    }


def event_to_public(row: Event) -> dict:
    extra = loads(row.payload)
    return {
        "id": row.id,
        "slug": row.slug,
        "title": row.title,
        "description": row.description,
        "date": row.date,
        "status": row.status,
        "createdAt": row.created_at.isoformat() if row.created_at else row.date,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else row.date,
        **extra,
    }


def staff_to_public(row: StaffMember) -> dict:
    extra = loads(row.payload)
    return {
        "id": row.id,
        "name": row.name,
        "role": row.role,
        "department": row.department,
        "status": row.status,
        "displayOnWebsite": extra.get("displayOnWebsite", True),
        **extra,
    }


def assemble_site(school: School, settings: SchoolSettings | None, rows: dict, *, public: bool = False) -> dict:
    bundle = loads(rows["bundle"].payload) if rows.get("bundle") else {}
    flags = parse_flags(school.feature_flags)
    theme = build_theme(school, settings)
    news = list(rows.get("news", []))
    events = list(rows.get("events", []))
    staff = list(rows.get("staff", []))
    departments = list(rows.get("departments", []))
    announcements = list(rows.get("announcements", []))
    documents = list(rows.get("documents", []))
    albums = list(rows.get("albums", []))
    pages = list(rows.get("pages", []))
    if public:
        news = [item for item in news if item.status == "published"]
        events = [item for item in events if item.status in {"published", "completed"}]
        staff = [
            item
            for item in staff
            if item.status == "active" and loads(item.payload).get("displayOnWebsite", True)
        ]
        departments = [item for item in departments if item.status in {"active", "published"}]
        announcements = [item for item in announcements if item.active]
        documents = [item for item in documents if item.status == "published"]
        albums = [item for item in albums if item.status == "published"]
        pages = [item for item in pages if item.status == "published"]
    album_payloads = []
    gallery = []
    for album in albums:
        extra = loads(album.payload)
        images = [
            {
                "id": img.id,
                "src": img.src,
                "alt": img.alt,
                "album": album.title,
                "albumSlug": album.slug,
                **loads(img.payload),
            }
            for img in album.images
        ]
        album_payloads.append(
            {
                "id": album.id,
                "slug": album.slug,
                "title": album.title,
                "status": album.status,
                "images": images,
                **extra,
            }
        )
        gallery.extend(images)

    content = {
        **bundle,
        "news": [news_to_public(item) for item in news],
        "events": [event_to_public(item) for item in events],
        "staff": [staff_to_public(item) for item in staff],
        "departments": [{**loads(d.payload), "id": d.id, "slug": d.slug, "name": d.name, "status": d.status} for d in departments],
        "announcements": [{**loads(a.payload), "id": a.id, "title": a.title, "message": a.message, "active": a.active} for a in announcements],
        "albums": album_payloads,
        "gallery": gallery,
        "resources": [{**loads(d.payload), "id": d.id, "name": d.name, "status": d.status} for d in documents],
        "mediaLibrary": [
            {
                "id": m.id,
                "url": m.url,
                "alt": m.alt,
                "name": m.filename,
                "mimeType": m.mime_type,
                "size": m.size,
                "kind": m.kind,
                "createdAt": m.created_at.isoformat() if m.created_at else "",
            }
            for m in rows.get("media", [])
        ],
        "contact": loads(settings.contact_json) if settings else bundle.get("contact", {}),
        "branding": loads(settings.branding_json) if settings else bundle.get("branding", {}),
    }
    if settings:
        stored_branding = loads(settings.branding_json)
        content["branding"] = {
            **stored_branding,
            "schoolName": settings.school_name,
            "motto": settings.motto or stored_branding.get("motto") or "",
            "primaryColor": settings.primary_color,
            "secondaryColor": settings.secondary_color,
            "accentColor": settings.accent_color,
            "crestUrl": settings.logo_url or stored_branding.get("crestUrl") or "",
            "faviconUrl": settings.favicon_url or stored_branding.get("faviconUrl") or "",
        }
        if not content.get("contact"):
            content["contact"] = loads(settings.contact_json)

    sections = [serialize_section(s) for s in sorted(rows.get("sections", []), key=lambda item: item.position)]
    if content.get("homepage") and sections:
        content["homepage"]["sections"] = [
            {"id": s["section_type"], "label": s["label"], "enabled": s["enabled"], "variant": s["variant"]}
            for s in sections
        ]

    return {
        "school": {
            "id": school.id,
            "name": school.name,
            "slug": school.slug,
            "status": school.status,
            "theme": theme["theme"],
            "logoUrl": theme.get("logoUrl") or school.logo_url,
            "faviconUrl": theme.get("faviconUrl") or school.favicon_url,
            "customDomain": school.custom_domain,
            "domain": school.domain,
        },
        "theme": theme,
        "settings": serialize_settings(school, settings),
        "features": flags,
        "navigation": bundle.get("navigation", DEFAULT_NAV),
        "homepage_sections": sections,
        "content": content,
        "pages": {p.slug: {**loads(p.body), "id": p.id, "title": p.title, "slug": p.slug} for p in pages},
    }
