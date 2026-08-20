"""Seed three development tenants. Run from backend/: python -m app.seed"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.content import Event, GalleryAlbum, GalleryImage, HomepageSection, NewsArticle, Page, SiteBundle, StaffMember
from app.models.school import School, SchoolDomain, SchoolSettings, SubscriptionPlan
from app.models.user import PRINCIPAL, SCHOOL_ADMIN, SUPER_ADMIN, User
from app.services.feature_service import DEFAULT_FEATURES
from app.services.platform_service import ensure_default_plans
from app.util.jsonutil import dumps, loads

BELAIR = "11111111-1111-1111-1111-111111111111"
MANCHESTER = "22222222-2222-2222-2222-222222222222"
DEMO = "33333333-3333-3333-3333-333333333333"

SECTIONS_BELAIR = [
    ("hero", "full-image"),
    ("quick_links", "default"),
    ("welcome", "default"),
    ("principal", "default"),
    ("news", "featured"),
    ("events", "cards"),
    ("statistics", "default"),
    ("academics", "default"),
    ("school-life", "default"),
    ("gallery", "grid"),
    ("cta", "default"),
]
SECTIONS_MANCHESTER = [
    ("hero", "cinematic"),
    ("identity", "gold"),
    ("principal", "editorial"),
    ("quick_links", "panels"),
    ("news", "editorial"),
    ("events", "date-list"),
    ("academics", "levels"),
    ("statistics", "band"),
    ("gallery", "masonry"),
    ("motto", "default"),
]
SECTIONS_DEMO = [
    ("hero", "compact"),
    ("announcement", "banner"),
    ("news", "list"),
    ("principal", "quote"),
    ("cta", "default"),
]
SECTIONS_MINIMAL = [
    ("hero", "compact"),
    ("welcome", "split"),
    ("news", "list"),
    ("events", "list"),
    ("cta", "split"),
    ("motto", "default"),
]
SECTIONS_SKY = [
    ("hero", "spotlight"),
    ("quick_links", "compact"),
    ("principal", "asymmetric"),
    ("news", "featured"),
    ("academics", "default"),
    ("events", "list"),
    ("school-life", "split"),
    ("achievements", "default"),
    ("documents", "cards"),
    ("cta", "connect"),
]
BELAIR_GREEN = "#0B3D2E"
CHRISTIANA_NAVY = "#073B52"


def _flags(**overrides):
    return dumps({**DEFAULT_FEATURES, **overrides})


def _sections(db: Session, school_id: str, items: list[tuple[str, str] | str]):
    for i, item in enumerate(items):
        name, variant = item if isinstance(item, tuple) else (item, "default")
        db.add(HomepageSection(school_id=school_id, section_type=name, position=i, enabled=True, variant=variant))


def ensure_sections(db: Session, school_id: str, items: list[tuple[str, str]]):
    rows = db.query(HomepageSection).filter(HomepageSection.school_id == school_id).all()
    customized = any(row.variant not in {"default", "", None} for row in rows) and any(row.section_type == "hero" for row in rows)
    if customized:
        return
    for row in rows:
        db.delete(row)
    db.flush()
    _sections(db, school_id, items)


MANCHESTER_QUICK_LINKS = [
    {"id": "mql-1", "title": "Academics", "description": "Curriculum and departments", "href": "/academics", "icon": "BookOpen"},
    {"id": "mql-2", "title": "Admissions", "description": "How to join us", "href": "/admissions", "icon": "ClipboardList"},
    {"id": "mql-3", "title": "Student Life", "description": "Clubs and sport", "href": "/school-life", "icon": "Users"},
    {"id": "mql-4", "title": "Calendar", "description": "Upcoming events", "href": "/events", "icon": "CalendarDays"},
    {"id": "mql-5", "title": "Staff", "description": "Directory", "href": "/about/staff", "icon": "GraduationCap"},
    {"id": "mql-6", "title": "Documents", "description": "Downloads", "href": "/resources", "icon": "FileText"},
]

MANCHESTER_PROGRAMMES = [
    {"id": "mp-1", "slug": "lower-school", "title": "Lower School", "summary": "Foundation years that build scholarship, character and study habits.", "description": "Lower school at Manchester High School prepares students for CSEC pathways.", "icon": "BookOpen", "href": "/academics", "active": True, "displayOrder": 1},
    {"id": "mp-2", "slug": "upper-school", "title": "Upper School", "summary": "CSEC preparation across a full academic and technical offering.", "description": "Upper school students sit CSEC examinations.", "icon": "Landmark", "href": "/academics", "active": True, "displayOrder": 2},
    {"id": "mp-3", "slug": "sixth-form", "title": "Sixth Form", "summary": "CAPE study for students continuing into Grades 12 and 13.", "description": "Sixth form offers CAPE Unit 1 and Unit 2.", "icon": "GraduationCap", "href": "/academics", "active": True, "displayOrder": 3},
]

PHOTO = {
    "campus": "https://images.unsplash.com/photo-1541339907385-03e1d5d0d6c4?auto=format&fit=crop&w=1600&q=80",
    "students": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    "classroom": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80",
    "assembly": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
    "library": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80",
    "sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?auto=format&fit=crop&w=1600&q=80",
}


def apply_manchester_heritage(db: Session) -> None:
    """Point only Manchester High at the heritage design system. Does not touch other tenants."""
    school = db.get(School, MANCHESTER)
    if school is None:
        return
    school.primary_color = "#241A00"
    school.secondary_color = "#FFD400"
    school.accent_color = "#4A3500"
    school.theme = "heritage"
    settings = school.settings
    if settings:
        settings.school_name = "Manchester High School"
        settings.short_name = "Manchester High"
        settings.motto = "Sic Luceat Lux"
        settings.primary_color = school.primary_color
        settings.secondary_color = school.secondary_color
        settings.accent_color = school.accent_color
        settings.theme = "heritage"
        settings.heading_font = "Playfair Display"
        settings.body_font = "Inter"
        settings.hero_style = "cinematic"
        settings.navbar_style = "heritage"
        settings.news_layout = "editorial"
        settings.events_layout = "date-list"
        settings.footer_style = "heritage"
        branding = loads(settings.branding_json)
        branding.update({
            "schoolName": "Manchester High School",
            "motto": "Sic Luceat Lux",
            "mottoTranslation": branding.get("mottoTranslation") or "Let Your Light Shine",
            "primaryColor": school.primary_color,
            "secondaryColor": school.secondary_color,
            "accentColor": school.accent_color,
        })
        settings.branding_json = dumps(branding)

    rows = db.query(HomepageSection).filter(HomepageSection.school_id == MANCHESTER).all()
    types = {row.section_type for row in rows}
    hero = next((row for row in rows if row.section_type == "hero"), None)
    if hero is None or hero.variant != "cinematic" or "identity" not in types or "motto" not in types:
        for row in rows:
            db.delete(row)
        db.flush()
        _sections(db, MANCHESTER, SECTIONS_MANCHESTER)

    bundle = db.query(SiteBundle).filter(SiteBundle.school_id == MANCHESTER).first()
    if bundle:
        payload = loads(bundle.payload)
        homepage = payload.get("homepage") or {}
        homepage["heroTitle"] = homepage.get("heroTitle") or "Manchester High School"
        homepage["heroTagline"] = "Tradition. Excellence. Leadership."
        homepage["heroEyebrow"] = homepage.get("heroEyebrow") or "Manchester High School"
        homepage["primaryButtonLabel"] = "Discover Manchester"
        homepage["primaryButtonUrl"] = homepage.get("primaryButtonUrl") or "/about"
        homepage["secondaryButtonLabel"] = "Latest News"
        homepage["secondaryButtonUrl"] = homepage.get("secondaryButtonUrl") or "/news"
        payload["homepage"] = homepage
        if not payload.get("quickLinks"):
            payload["quickLinks"] = MANCHESTER_QUICK_LINKS
        if not payload.get("programmes"):
            payload["programmes"] = MANCHESTER_PROGRAMMES
        principal = payload.get("principal") or {}
        if not principal.get("excerpt"):
            principal["excerpt"] = "Welcome to Manchester High School. We are a community grounded in scholarship, character and service."
        payload["principal"] = principal
        bundle.payload = dumps(payload)

    news_slugs = {row.slug for row in db.query(NewsArticle).filter(NewsArticle.school_id == MANCHESTER)}
    first = db.get(NewsArticle, "n-man-1")
    if first:
        first.show_on_homepage = True
        first.is_featured = True
        if not first.image:
            first.image = PHOTO["assembly"]
    extras = [
        ("n-man-2", "cape-orientation", "Sixth form orientation", "New CAPE students were welcomed for the academic year.", "<p>Manchester High School welcomed sixth-form students for CAPE orientation.</p>", "Academic", PHOTO["classroom"], "2026-08-08"),
        ("n-man-3", "campus-assembly", "Opening assembly", "The school gathered for the start-of-term assembly.", "<p>Students and staff assembled for the opening of term.</p>", "Student Life", PHOTO["students"], "2026-07-22"),
        ("n-man-4", "inter-house-preview", "Inter-house competition preview", "Houses prepared for the term's sporting fixtures.", "<p>House captains outlined plans for the term's fixtures and service projects.</p>", "Sports", PHOTO["sports"], "2026-07-15"),
    ]
    for news_id, slug, title, excerpt, content, category, image, date in extras:
        if slug in news_slugs:
            continue
        db.add(NewsArticle(
            id=news_id, school_id=MANCHESTER, slug=slug, title=title, excerpt=excerpt, content=content,
            category=category, author="Communications", date=date, status="published",
            show_on_homepage=True, image=image,
        ))

    event_slugs = {row.slug for row in db.query(Event).filter(Event.school_id == MANCHESTER)}
    extra_events = [
        ("e-man-2", "pta-meeting", "PTA Meeting", "Term meeting of the Parent Teacher Association.", "2026-09-24", "Auditorium", "PTA", "5:00 p.m."),
        ("e-man-3", "sports-day", "Sports Day", "Annual inter-house athletics.", "2026-10-03", "School Grounds", "Sports", "9:00 a.m."),
    ]
    for event_id, slug, title, description, date, location, category, start in extra_events:
        if slug in event_slugs:
            continue
        db.add(Event(
            id=event_id, school_id=MANCHESTER, slug=slug, title=title, description=description, date=date,
            status="published",
            payload=dumps({"location": location, "category": category, "startTime": start, "showOnHomepage": True}),
        ))

    if db.get(GalleryAlbum, "alb-man-1") is None:
        album = GalleryAlbum(
            id="alb-man-1", school_id=MANCHESTER, slug="campus-life", title="Campus Life", status="published",
            payload=dumps({"description": "Photographs of school life in Mandeville.", "category": "Campus Life"}),
        )
        db.add(album)
        db.flush()
        for i, (key, alt) in enumerate([
            ("campus", "Campus grounds"),
            ("students", "Students on campus"),
            ("classroom", "Classroom"),
            ("library", "Library"),
            ("assembly", "School assembly"),
            ("sports", "Athletics"),
        ], start=1):
            db.add(GalleryImage(
                id=f"g-man-{i}", school_id=MANCHESTER, album_id="alb-man-1",
                src=PHOTO[key], alt=alt, payload=dumps({"album": "Campus Life", "albumSlug": "campus-life"}),
            ))


def apply_knox_minimal(db: Session) -> None:
    """Restore Knox College to the minimal blue/red look after Belair colours were copied onto it."""
    school = db.query(School).filter(School.slug == "knox-college").first()
    if school is None:
        return
    preset = {
        "primary": "#123A73",
        "secondary": "#C8102E",
        "accent": "#1D4E89",
    }
    still_belair_colours = school.primary_color in {None, "", BELAIR_GREEN} or (
        school.settings is not None and school.settings.primary_color == BELAIR_GREEN
    )
    if still_belair_colours:
        school.primary_color = preset["primary"]
        school.secondary_color = preset["secondary"]
        school.accent_color = preset["accent"]
    school.theme = "minimal"
    settings = school.settings
    if settings:
        settings.theme = "minimal"
        settings.heading_font = "DM Sans"
        settings.body_font = "DM Sans"
        settings.hero_style = "compact"
        settings.navbar_style = "floating"
        settings.news_layout = "list"
        settings.events_layout = "list"
        settings.footer_style = "minimal"
        if still_belair_colours:
            settings.primary_color = school.primary_color
            settings.secondary_color = school.secondary_color
            settings.accent_color = school.accent_color
        branding = loads(settings.branding_json)
        branding.update({
            "schoolName": settings.school_name or school.name,
            "motto": settings.motto or branding.get("motto") or "",
            "primaryColor": settings.primary_color,
            "secondaryColor": settings.secondary_color,
            "accentColor": settings.accent_color,
        })
        settings.branding_json = dumps(branding)

    rows = db.query(HomepageSection).filter(HomepageSection.school_id == school.id).all()
    types = [row.section_type for row in sorted(rows, key=lambda row: row.position)]
    belair_layout = types == [name for name, _variant in SECTIONS_BELAIR]
    hero = next((row for row in rows if row.section_type == "hero"), None)
    if belair_layout or (hero is not None and hero.variant == "full-image"):
        for row in rows:
            db.delete(row)
        db.flush()
        _sections(db, school.id, SECTIONS_MINIMAL)


def apply_christiana_sky(db: Session) -> None:
    """Give Christiana High the sky theme and a distinct homepage. Does not touch other tenants."""
    school = db.query(School).filter(School.slug == "christiana-high-school").first()
    if school is None:
        return
    school.theme = "sky"
    school.primary_color = CHRISTIANA_NAVY
    school.secondary_color = "#53C7E8"
    school.accent_color = "#167EA5"
    settings = school.settings
    motto = (settings.motto if settings and settings.motto else None) or "Our Best Jamaica Hope"
    if settings:
        settings.school_name = "Christiana High School"
        settings.short_name = "Christiana High"
        settings.motto = motto
        settings.theme = "sky"
        settings.primary_color = school.primary_color
        settings.secondary_color = school.secondary_color
        settings.accent_color = school.accent_color
        settings.heading_font = "Outfit"
        settings.body_font = "Inter"
        settings.hero_style = "spotlight"
        settings.navbar_style = "light"
        settings.news_layout = "featured"
        settings.events_layout = "list"
        settings.footer_style = "structured"
        branding = loads(settings.branding_json)
        branding.update({
            "schoolName": "Christiana High School",
            "motto": motto,
            "primaryColor": school.primary_color,
            "secondaryColor": school.secondary_color,
            "accentColor": school.accent_color,
        })
        settings.branding_json = dumps(branding)
        contact = loads(settings.contact_json)
        contact.setdefault("schoolName", "Christiana High School")
        contact.setdefault("addressLines", [])
        contact.setdefault("phone", [])
        contact.setdefault("email", [])
        contact.setdefault("officeHours", "")
        contact.setdefault("mapEmbedUrl", "")
        contact.setdefault("social", [])
        settings.contact_json = dumps(contact)

    rows = db.query(HomepageSection).filter(HomepageSection.school_id == school.id).all()
    types = [row.section_type for row in sorted(rows, key=lambda row: row.position)]
    hero = next((row for row in rows if row.section_type == "hero"), None)
    if types != [name for name, _variant in SECTIONS_SKY] or (hero is not None and hero.variant != "spotlight"):
        for row in rows:
            db.delete(row)
        db.flush()
        _sections(db, school.id, SECTIONS_SKY)

    bundle = db.query(SiteBundle).filter(SiteBundle.school_id == school.id).first()
    if bundle:
        payload = loads(bundle.payload)
        payload["homepage"] = {
            **(payload.get("homepage") or {}),
            "heroTitle": "Christiana High School",
            "heroTagline": "Empowering Students. Building Character. Shaping the Future.",
            "heroEyebrow": "Christiana High School",
            "primaryButtonLabel": "Explore Christiana High",
            "primaryButtonUrl": "/about",
            "secondaryButtonLabel": "Admissions",
            "secondaryButtonUrl": "/admissions",
            "welcomeTitle": "Welcome to Christiana High School",
            "welcomeBody": [
                "Christiana High School is an established institution preparing young people for the future.",
                "This website shares school news, admissions information and campus life. Administrators can replace this welcome copy at any time.",
            ],
            "welcomeButtonLabel": "Learn more about us",
            "welcomeButtonUrl": "/about",
        }
        principal = payload.get("principal") or {}
        principal.update({
            "name": principal.get("name") or "Principal",
            "title": principal.get("title") or "Principal",
            "excerpt": principal.get("excerpt") or "Welcome to Christiana High School. We are committed to academic growth, character and service.",
            "content": principal.get("content") or "<p>Welcome to Christiana High School. We are committed to academic growth, character and service in our community.</p>",
            "messageTitle": principal.get("messageTitle") or "Welcome",
            "signature": principal.get("signature") or "Principal",
        })
        payload["principal"] = principal
        payload["quickLinks"] = payload.get("quickLinks") or [
            {"id": "chs-ql-1", "title": "Admissions", "description": "Join our school community", "href": "/admissions", "icon": "ClipboardList"},
            {"id": "chs-ql-2", "title": "Student Resources", "description": "Guides and support", "href": "/students", "icon": "Users"},
            {"id": "chs-ql-3", "title": "School Calendar", "description": "Upcoming dates", "href": "/events", "icon": "CalendarDays"},
            {"id": "chs-ql-4", "title": "Contact Us", "description": "Reach the school office", "href": "/contact", "icon": "Phone"},
            {"id": "chs-ql-5", "title": "Latest News", "description": "Stories from campus", "href": "/news", "icon": "Newspaper"},
        ]
        payload["programmes"] = payload.get("programmes") or [
            {"id": "chs-p-1", "title": "Sciences", "summary": "Explore science pathways offered at the school.", "href": "/academics", "icon": "Atom", "active": True, "displayOrder": 1},
            {"id": "chs-p-2", "title": "Mathematics", "summary": "Build strong numeracy and problem-solving skills.", "href": "/academics", "icon": "BookOpen", "active": True, "displayOrder": 2},
            {"id": "chs-p-3", "title": "Humanities", "summary": "Language, history and the social sciences.", "href": "/academics", "icon": "Landmark", "active": True, "displayOrder": 3},
            {"id": "chs-p-4", "title": "Business", "summary": "Commerce and enterprise studies.", "href": "/academics", "icon": "Briefcase", "active": True, "displayOrder": 4},
            {"id": "chs-p-5", "title": "Technical & Vocational", "summary": "Practical skills and technical programmes.", "href": "/academics", "icon": "Wrench", "active": True, "displayOrder": 5},
            {"id": "chs-p-6", "title": "Information Technology", "summary": "Digital literacy and computing.", "href": "/academics", "icon": "Globe", "active": True, "displayOrder": 6},
        ]
        payload["about"] = payload.get("about") or {
            "overview": [
                "Christiana High School serves students and families in our community. This page will hold the official school story as it is confirmed by the administration.",
            ],
            "history": [
                "A full history of Christiana High School can be added here by the school administrator when official text is ready.",
            ],
            "mission": "To be confirmed by the school. A mission statement can be published from the content management system.",
            "vision": "To be confirmed by the school. A vision statement can be published from the content management system.",
            "motto": motto,
            "crestExplanation": [
                "The school crest uses light cyan, white, black and deeper blue. A full explanation of its symbols can be added by the administration.",
            ],
            "achievements": [
                "Academic effort and examination success will be listed here as the school publishes them.",
                "Sporting participation and team achievements will appear here when confirmed.",
                "Cultural, club and community contributions will be shared as they are recorded.",
            ],
            "campus": [
                "Campus details can be added by the school administrator.",
            ],
        }
        payload["admissions"] = payload.get("admissions") or {
            "intro": ["Families interested in Christiana High School can use this page for an overview. Official requirements and dates will be published by the school."],
            "requirements": ["Admission requirements will be listed here once confirmed by the school office."],
            "process": ["The registration process will be outlined here by the administration."],
            "documents": ["Required documents will be listed here and linked from Downloads when files are uploaded."],
            "transfers": ["Transfer information can be added by the school administrator."],
            "deadlines": [],
            "faqs": [
                {"q": "How do I apply?", "a": "Contact the school office for the current admissions process. Dates and forms will be published here when available."},
                {"q": "Where can I find forms?", "a": "Downloadable forms appear on the Resources page after the school uploads them."},
            ],
        }
        payload["values"] = payload.get("values") or [
            {"title": "Character", "description": "We encourage honesty, respect and responsibility."},
            {"title": "Scholarship", "description": "We support students as they work towards academic excellence."},
            {"title": "Community", "description": "We value partnership with families and the wider community."},
            {"title": "Service", "description": "We prepare young people to contribute beyond the classroom."},
        ]
        payload["contact"] = payload.get("contact") or loads(settings.contact_json) if settings else {}
        bundle.payload = dumps(payload)

    if db.query(NewsArticle).filter(NewsArticle.school_id == school.id).first() is None:
        db.add(NewsArticle(
            school_id=school.id,
            slug="welcome-to-our-website",
            title="Welcome to the Christiana High School website",
            excerpt="News, events and admissions information will be published here by the school.",
            content="<p>Christiana High School now has an official website on this platform. School news and notices will appear here as they are published.</p>",
            category="General",
            author="Communications",
            date="2026-08-15",
            status="published",
            show_on_homepage=True,
            is_featured=True,
        ))


def seed(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        plan = db.get(SubscriptionPlan, "plan-professional")
        if plan is None:
            plan = SubscriptionPlan(id="plan-professional", name="Professional", slug="professional", max_admins=10, max_storage_mb=5120)
            db.add(plan)
            db.flush()
        db.add(
            School(
                id=BELAIR,
                name="Bel-Air High School",
                slug="belair-high",
                domain="belair.schoolplatform.com",
                custom_domain="belairhigh.edu.jm",
                primary_color="#0B3D2E",
                secondary_color="#FFD100",
                accent_color="#145C45",
                theme="classic",
                status="active",
                subscription_plan_id=plan.id,
                subscription_status="active",
                feature_flags=_flags(),
            )
        )
        db.flush()
        db.add(SchoolDomain(school_id=BELAIR, domain="belairhigh.edu.jm", is_primary=True, verified=True))
        db.add(SchoolDomain(school_id=BELAIR, domain="belair.schoolplatform.com", is_primary=False, verified=True))
        db.add(
            SchoolSettings(
                school_id=BELAIR,
                school_name="Bel-Air High School",
                short_name="Bel-Air",
                motto="Unity Through Friendship and Knowledge",
                primary_color="#0B3D2E",
                secondary_color="#FFD100",
                accent_color="#145C45",
                heading_font="Montserrat",
                body_font="Inter",
                principal_name="Dr Donnalyn King",
                address="43 deCarteret Road, Mandeville, Manchester, Jamaica",
                phone="(876) 962-0216",
                email="general@belairhighschoolja.com",
                contact_json=dumps({
                    "schoolName": "Bel-Air High School",
                    "addressLines": ["43 deCarteret Road", "Mandeville", "Manchester, Jamaica"],
                    "phone": ["(876) 962-0216", "(876) 962-2168"],
                    "email": ["general@belairhighschoolja.com", "admissions@belairhighschoolja.com"],
                    "officeHours": "Monday to Friday, 8:00 a.m. – 3:30 p.m.",
                    "mapEmbedUrl": "https://maps.google.com/maps?q=43%20deCarteret%20Road%20Mandeville%20Jamaica&t=&z=16&ie=UTF8&iwloc=&output=embed",
                    "social": [
                        {"platform": "Facebook", "href": "https://www.facebook.com", "enabled": True},
                        {"platform": "Instagram", "href": "https://www.instagram.com", "enabled": True},
                        {"platform": "YouTube", "href": "https://www.youtube.com", "enabled": True},
                    ],
                }),
                branding_json=dumps({
                    "schoolName": "Bel-Air High School",
                    "motto": "Unity Through Friendship and Knowledge",
                    "primaryColor": "#0B3D2E",
                    "secondaryColor": "#FFD100",
                    "accentColor": "#145C45",
                }),
            )
        )
        db.add(NewsArticle(
            id="n-belair-1", school_id=BELAIR, slug="dacosta-cup-round-of-32",
            title="Footballers first through to daCosta Cup round of 32",
            excerpt="Bel-Air completed a seven-match winning run with a 5–1 result against Mount St Joseph.",
            content="<p>Bel-Air High became the first school to qualify for the ISSA/Wata daCosta Cup round of 32.</p>",
            category="Sports", author="Sports Department", date="2026-08-03",
            status="published", is_featured=True, show_on_homepage=True, featured_priority=1,
        ))
        db.add(NewsArticle(
            id="n-belair-2", school_id=BELAIR, slug="grade-11-mock-examinations",
            title="Grade 11 mock examinations begin Monday",
            excerpt="Candidates should arrive in full uniform with the published timetable.",
            content="<p>Grade 11 mock examinations begin on Monday under examination conditions.</p>",
            category="Announcements", author="Examination Centre", date="2026-08-10",
            status="published", show_on_homepage=True,
        ))
        db.add(Event(
            id="e-belair-1", school_id=BELAIR, slug="sports-day", title="Sports Day",
            description="Inter-house track and field at Bel-Air High School.",
            date="2026-10-02", status="published",
            payload=dumps({"startTime": "8:30 a.m.", "location": "School field", "category": "Sports", "showOnHomepage": True, "featured": True, "allDay": False}),
        ))
        db.add(StaffMember(
            id="s-belair-1", school_id=BELAIR, name="Dr Donnalyn King", role="Principal",
            department="Administration", status="active",
            payload=dumps({"email": "principal@belairhighschoolja.com", "administration": True, "displayOnWebsite": True, "honorific": "Dr.", "firstName": "Donnalyn", "lastName": "King"}),
        ))
        db.add(Page(school_id=BELAIR, slug="about", title="About", body=dumps({"overview": ["Bel-Air High School is a co-educational secondary school in Mandeville, established in 1968."]})))
        db.add(SiteBundle(school_id=BELAIR, payload=dumps({
            "homepage": {
                "heroEyebrow": "Mandeville, Manchester · Established 1968",
                "heroTitle": "Bel-Air High School",
                "heroTagline": "Excellence. Integrity. Responsibility. Respect.",
                "welcomeTitle": "Welcome to Bel-Air High School",
                "welcomeBody": ["Bel-Air High School is a co-educational secondary school in the hills of Mandeville."],
                "primaryButtonLabel": "Explore Our School",
                "primaryButtonUrl": "/about",
                "secondaryButtonLabel": "Admissions",
                "secondaryButtonUrl": "/admissions",
            },
            "principal": {"name": "Dr Donnalyn King", "title": "Principal", "excerpt": "Welcome to Bel-Air High School.", "content": "<p>It is my privilege to welcome you to Bel-Air High School.</p>", "paragraphs": [], "signature": "Dr Donnalyn King", "photo": "", "messageTitle": "Welcome to Bel-Air High School"},
            "houses": [],
            "clubs": [],
            "sports": [],
            "programmes": [],
            "quickLinks": [],
            "statistics": [{"id": "st-1", "label": "Students", "value": 860, "suffix": "+", "visible": True, "order": 1}],
            "values": [],
        })))
        _sections(db, BELAIR, SECTIONS_BELAIR)
        db.add(User(id="u-belair-admin", school_id=BELAIR, name="Bel-Air Administrator", email="admin@belairhighschoolja.com", password_hash=hash_password("belair1968"), role=SCHOOL_ADMIN, is_active=True))

    if db.get(School, MANCHESTER) is None:
        db.add(School(
            id=MANCHESTER, name="Manchester High School", slug="manchester-high",
            domain="manchester.schoolplatform.com", custom_domain="manchesterhigh.edu.jm",
            primary_color="#241A00", secondary_color="#FFD400", accent_color="#4A3500",
            theme="heritage", status="active", subscription_status="active", feature_flags=_flags(online_admissions=True),
        ))
        db.flush()
        db.add(SchoolDomain(school_id=MANCHESTER, domain="manchesterhigh.edu.jm", is_primary=True, verified=True))
        db.add(SchoolSettings(
            school_id=MANCHESTER, school_name="Manchester High School", short_name="Manchester High",
            motto="Sic Luceat Lux", primary_color="#241A00", secondary_color="#FFD400", accent_color="#4A3500",
            theme="heritage", hero_style="cinematic", news_layout="editorial", events_layout="date-list",
            navbar_style="heritage", footer_style="heritage",
            heading_font="Playfair Display", body_font="Inter",
            contact_json=dumps({"schoolName": "Manchester High School", "addressLines": ["Mandeville", "Manchester, Jamaica"], "phone": ["(876) 962-0000"], "email": ["office@manchesterhigh.edu.jm"], "officeHours": "Monday to Friday, 8:00 a.m. – 3:00 p.m.", "mapEmbedUrl": "", "social": []}),
            branding_json=dumps({"schoolName": "Manchester High School", "motto": "Sic Luceat Lux", "mottoTranslation": "Let Your Light Shine", "primaryColor": "#241A00", "secondaryColor": "#FFD400", "accentColor": "#4A3500"}),
        ))
        db.add(NewsArticle(
            id="n-man-1", school_id=MANCHESTER, slug="science-fair-winners",
            title="Science fair winners announced", excerpt="Manchester High students placed in the parish STEM expo.",
            content="<p>Manchester High celebrated parish science fair results this week.</p>",
            category="Academic", author="Science Department", date="2026-08-01", status="published", show_on_homepage=True,
        ))
        db.add(Event(id="e-man-1", school_id=MANCHESTER, slug="founders-day", title="Founders' Day", description="Annual founders' assembly.", date="2026-09-20", status="published", payload=dumps({"location": "Auditorium", "category": "Academic", "startTime": "9:00 a.m.", "showOnHomepage": True})))
        db.add(StaffMember(id="s-man-1", school_id=MANCHESTER, name="Dr A. Campbell", role="Principal", department="Administration", status="active", payload=dumps({"displayOnWebsite": True, "administration": True})))
        db.add(Page(school_id=MANCHESTER, slug="about", title="About", body=dumps({"overview": ["Manchester High School is a long-standing secondary school in Mandeville."]})))
        db.add(SiteBundle(school_id=MANCHESTER, payload=dumps({
            "homepage": {
                "heroTitle": "Manchester High School",
                "heroTagline": "Tradition. Excellence. Leadership.",
                "heroEyebrow": "Manchester High School",
                "welcomeTitle": "Welcome",
                "welcomeBody": ["A tradition of scholarship in Manchester."],
                "primaryButtonLabel": "Discover Manchester",
                "primaryButtonUrl": "/about",
                "secondaryButtonLabel": "Latest News",
                "secondaryButtonUrl": "/news",
            },
            "principal": {"name": "Dr A. Campbell", "title": "Principal", "excerpt": "Welcome to Manchester High School. We are a community grounded in scholarship, character and service.", "content": "<p>Welcome to Manchester High School.</p>", "paragraphs": [], "signature": "Dr A. Campbell", "photo": "", "messageTitle": "Welcome"},
            "statistics": [{"id": "st-m1", "label": "Students", "value": 1200, "suffix": "+", "visible": True, "order": 1}],
            "quickLinks": [
                {"id": "mql-1", "title": "Academics", "description": "Curriculum and departments", "href": "/academics", "icon": "BookOpen"},
                {"id": "mql-2", "title": "Admissions", "description": "How to join us", "href": "/admissions", "icon": "ClipboardList"},
                {"id": "mql-3", "title": "Student Life", "description": "Clubs and sport", "href": "/school-life", "icon": "Users"},
                {"id": "mql-4", "title": "Calendar", "description": "Upcoming events", "href": "/events", "icon": "CalendarDays"},
                {"id": "mql-5", "title": "Staff", "description": "Directory", "href": "/about/staff", "icon": "GraduationCap"},
                {"id": "mql-6", "title": "Documents", "description": "Downloads", "href": "/resources", "icon": "FileText"},
            ],
            "programmes": [
                {"id": "mp-1", "slug": "lower-school", "title": "Lower School", "summary": "Foundation years that build scholarship, character and study habits.", "description": "Lower school at Manchester High School prepares students for CSEC pathways.", "icon": "BookOpen", "href": "/academics", "active": True, "displayOrder": 1},
                {"id": "mp-2", "slug": "upper-school", "title": "Upper School", "summary": "CSEC preparation across a full academic and technical offering.", "description": "Upper school students sit CSEC examinations.", "icon": "Landmark", "href": "/academics", "active": True, "displayOrder": 2},
                {"id": "mp-3", "slug": "sixth-form", "title": "Sixth Form", "summary": "CAPE study for students continuing into Grades 12 and 13.", "description": "Sixth form offers CAPE Unit 1 and Unit 2.", "icon": "GraduationCap", "href": "/academics", "active": True, "displayOrder": 3},
            ],
        })))
        _sections(db, MANCHESTER, SECTIONS_MANCHESTER)
        db.add(User(id="u-man-admin", school_id=MANCHESTER, name="Manchester Administrator", email="admin@manchesterhigh.edu.jm", password_hash=hash_password("manchester1968"), role=SCHOOL_ADMIN, is_active=True))

    if db.get(School, DEMO) is None:
        db.add(School(
            id=DEMO, name="Demo Academy", slug="demo-academy",
            domain="demo.schoolplatform.com", custom_domain="demoacademy.edu.jm",
            primary_color="#0F766E", secondary_color="#F4D58D", accent_color="#115E59",
            theme="modern", status="active", subscription_status="trial", feature_flags=_flags(gallery=False),
        ))
        db.flush()
        db.add(SchoolDomain(school_id=DEMO, domain="demo.schoolplatform.com", is_primary=True, verified=True))
        db.add(SchoolSettings(
            school_id=DEMO, school_name="Demo Academy", short_name="Demo", motto="Learn. Lead. Serve.",
            primary_color="#0F766E", secondary_color="#F4D58D", accent_color="#115E59", theme="modern",
            hero_style="compact", news_layout="list", events_layout="timeline", navbar_style="centered",
            heading_font="Outfit", body_font="Inter",
            contact_json=dumps({"schoolName": "Demo Academy", "addressLines": ["Kingston", "Jamaica"], "phone": ["(876) 555-0100"], "email": ["hello@demoacademy.edu.jm"], "officeHours": "Weekdays 8:00–3:00", "mapEmbedUrl": "", "social": []}),
            branding_json=dumps({"schoolName": "Demo Academy", "motto": "Learn. Lead. Serve.", "primaryColor": "#0F766E", "secondaryColor": "#F4D58D", "accentColor": "#115E59"}),
        ))
        db.add(NewsArticle(id="n-demo-1", school_id=DEMO, slug="welcome-to-demo-academy", title="Welcome to Demo Academy", excerpt="A sample tenant used to verify multi-school hosting.", content="<p>This is Demo Academy, a second test school on the platform.</p>", category="General", author="Communications", date="2026-08-12", status="published", show_on_homepage=True))
        db.add(Event(id="e-demo-1", school_id=DEMO, slug="open-day", title="Open Day", description="Tour the Demo Academy campus.", date="2026-09-01", status="published", payload=dumps({"location": "Campus", "category": "Student activities", "startTime": "10:00 a.m."})))
        db.add(StaffMember(id="s-demo-1", school_id=DEMO, name="Jordan Blake", role="Principal", department="Administration", status="active", payload=dumps({"displayOnWebsite": True, "administration": True})))
        db.add(Page(school_id=DEMO, slug="about", title="About", body=dumps({"overview": ["Demo Academy is a sample school for platform development."]})))
        db.add(SiteBundle(school_id=DEMO, payload=dumps({
            "homepage": {"heroTitle": "Demo Academy", "heroTagline": "Learn. Lead. Serve.", "heroEyebrow": "Sample tenant", "welcomeTitle": "A modern school site", "welcomeBody": ["Different colours, layout and content from Bel-Air."], "primaryButtonLabel": "News", "primaryButtonUrl": "/news", "secondaryButtonLabel": "Contact", "secondaryButtonUrl": "/contact"},
            "principal": {"name": "Jordan Blake", "title": "Principal", "excerpt": "Welcome to Demo Academy.", "content": "<p>Welcome.</p>", "paragraphs": [], "signature": "Jordan Blake", "photo": "", "messageTitle": "Welcome"},
            "statistics": [{"id": "st-d1", "label": "Classes", "value": 24, "visible": True, "order": 1}],
        })))
        _sections(db, DEMO, SECTIONS_DEMO)
        db.add(User(id="u-demo-admin", school_id=DEMO, name="Demo Administrator", email="admin@demoacademy.edu.jm", password_hash=hash_password("demo1968"), role=SCHOOL_ADMIN, is_active=True))

    if db.query(User).filter(User.role == SUPER_ADMIN).first() is None:
        db.add(User(id="u-platform", school_id=None, name="Platform Owner", email="platform@schoolplatform.com", password_hash=hash_password("platform1968"), role=SUPER_ADMIN, is_active=True))

    ensure_default_plans(db)

    ensure_sections(db, BELAIR, SECTIONS_BELAIR)
    ensure_sections(db, MANCHESTER, SECTIONS_MANCHESTER)
    ensure_sections(db, DEMO, SECTIONS_DEMO)
    apply_manchester_heritage(db)
    apply_knox_minimal(db)
    apply_christiana_sky(db)

    ensure_principals(db)

    db.commit()


def ensure_principals(db: Session) -> None:
    accounts = [
        ("u-belair-principal", BELAIR, "John Brown", "principal@belairhighschoolja.com", "belair1968"),
        ("u-man-principal", MANCHESTER, "A. Campbell", "principal@manchesterhigh.edu.jm", "manchester1968"),
        ("u-demo-principal", DEMO, "Jordan Blake", "principal@demoacademy.edu.jm", "demo1968"),
    ]
    for user_id, school_id, name, email, password in accounts:
        if db.get(School, school_id) is None:
            continue
        if db.get(User, user_id) is not None or db.query(User).filter(User.email == email).first():
            continue
        db.add(User(
            id=user_id,
            school_id=school_id,
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=PRINCIPAL,
            is_active=True,
        ))
    christiana = db.query(School).filter(School.slug == "christiana-high-school").first()
    if christiana and db.query(User).filter(User.email == "principal@christiana.test").first() is None:
        db.add(User(
            school_id=christiana.id,
            name="John Brown",
            email="principal@christiana.test",
            password_hash=hash_password("christiana1968"),
            role=PRINCIPAL,
            is_active=True,
        ))


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
        print("Seeded Belair High, Manchester High, Demo Academy, and platform owner.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
