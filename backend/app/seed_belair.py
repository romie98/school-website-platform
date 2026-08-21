"""Idempotent Bel-Air demo content. Bootstrap missing records only — never overwrite edits."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.content import (
    Announcement,
    Department,
    Document,
    Event,
    GalleryAlbum,
    GalleryImage,
    HomepageSection,
    NewsArticle,
    Page,
    SiteBundle,
    StaffMember,
)
from app.models.school import School, SchoolDomain, SchoolSettings, SubscriptionPlan
from app.models.user import SCHOOL_ADMIN, User
from app.services.feature_service import DEFAULT_FEATURES
from app.util.jsonutil import dumps, loads

BELAIR = "11111111-1111-1111-1111-111111111111"

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

PHOTO = {
    "hero": "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=80",
    "courtyard": "https://images.unsplash.com/photo-1541829070764-84a7d30dea3f?auto=format&fit=crop&w=1600&q=80",
    "classroom": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80",
    "students": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    "lecture": "https://images.unsplash.com/photo-1427504494782-3e7ce9dbafae?auto=format&fit=crop&w=1600&q=80",
    "exam": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80",
    "football": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
    "sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?auto=format&fit=crop&w=1600&q=80",
    "assembly": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
    "community": "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80",
    "principal": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    "science": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80",
    "computers": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    "leadership": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80",
    "graduation": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80",
    "parents": "https://images.unsplash.com/photo-1609220136736-443140cff224?auto=format&fit=crop&w=1600&q=80",
    "music": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80",
    "drama": "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1600&q=80",
    "art": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80",
    "netball": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80",
    "basketball": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80",
    "cricket": "https://images.unsplash.com/photo-1531415074968-9d331b88c5d5?auto=format&fit=crop&w=1600&q=80",
    "volleyball": "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1600&q=80",
    "writing": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=80",
    "hills": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80",
    "lab": "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1600&q=80",
    "collaboration": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    "vp": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80",
    "t1": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80",
    "t2": "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=800&q=80",
    "t3": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80",
    "t4": "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=800&q=80",
    "t5": "https://images.unsplash.com/photo-1614283233556-f35b0c801304?auto=format&fit=crop&w=800&q=80",
    "t6": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
    "s1": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    "s2": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
}


def _html(paragraphs: list[str]) -> str:
    return "".join(f"<p>{item}</p>" for item in paragraphs)


def _empty(value) -> bool:
    return value in (None, "", [], {})


def fill_missing(target: dict, defaults: dict) -> dict:
    for key, value in defaults.items():
        if _empty(target.get(key)):
            target[key] = value
        elif isinstance(value, dict) and isinstance(target.get(key), dict):
            fill_missing(target[key], value)
    return target


def _news_exists(db: Session, slug: str) -> bool:
    return (
        db.query(NewsArticle).filter(NewsArticle.school_id == BELAIR, NewsArticle.slug == slug).first() is not None
    )


def _event_exists(db: Session, slug: str) -> bool:
    return db.query(Event).filter(Event.school_id == BELAIR, Event.slug == slug).first() is not None


def ensure_belair_school(db: Session) -> None:
    if db.get(School, BELAIR) is not None:
        return
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
            feature_flags=dumps({**DEFAULT_FEATURES}),
        )
    )
    db.flush()


def ensure_belair_domains(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    existing = {row.domain for row in db.query(SchoolDomain).filter(SchoolDomain.school_id == BELAIR)}
    if "belairhigh.edu.jm" not in existing:
        db.add(SchoolDomain(school_id=BELAIR, domain="belairhigh.edu.jm", is_primary=True, verified=True))
    if "belair.schoolplatform.com" not in existing:
        db.add(SchoolDomain(school_id=BELAIR, domain="belair.schoolplatform.com", is_primary=False, verified=True))


def ensure_belair_settings(db: Session) -> None:
    school = db.get(School, BELAIR)
    if school is None or school.settings is not None:
        return
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


def ensure_belair_admin(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    if db.get(User, "u-belair-admin") is not None:
        return
    if db.query(User).filter(User.email == "admin@belairhighschoolja.com").first() is not None:
        return
    db.add(User(
        id="u-belair-admin",
        school_id=BELAIR,
        name="Bel-Air Administrator",
        email="admin@belairhighschoolja.com",
        password_hash=hash_password("belair1968"),
        role=SCHOOL_ADMIN,
        is_active=True,
    ))


def _bundle_defaults() -> dict:
    return {
        "homepage": {
            "heroEyebrow": "Mandeville, Manchester · Established 1968",
            "heroTitle": "Bel-Air High School",
            "heroTagline": "Excellence. Integrity. Responsibility. Respect.",
            "heroImage": PHOTO["hero"],
            "welcomeTitle": "Welcome to Bel-Air High School",
            "welcomeBody": [
                "Bel-Air High School is a co-educational secondary school in the hills of Mandeville, serving families across Manchester and neighbouring parishes. Since 1968 we have prepared young people for CSEC, CAPE and life beyond the classroom.",
                "Our motto, Unity Through Friendship and Knowledge, shapes daily life on campus: high academic expectation, firm but fair discipline, and a community that looks after its own.",
            ],
            "welcomeImage": PHOTO["courtyard"],
            "primaryButtonLabel": "Explore Our School",
            "primaryButtonUrl": "/about",
            "secondaryButtonLabel": "Admissions",
            "secondaryButtonUrl": "/admissions",
        },
        "quickLinks": [
            {"id": "ql-1", "title": "Admissions", "description": "Entry requirements and how to apply", "href": "/admissions", "icon": "ClipboardList"},
            {"id": "ql-2", "title": "Student Portal", "description": "Timetables, forms and student tools", "href": "/students", "icon": "GraduationCap"},
            {"id": "ql-3", "title": "Parent Portal", "description": "Notices, PTA and parent resources", "href": "/parents", "icon": "Users"},
            {"id": "ql-4", "title": "School Calendar", "description": "Exams, meetings and school events", "href": "/events", "icon": "CalendarDays"},
            {"id": "ql-5", "title": "Downloads", "description": "Handbooks, booklists and forms", "href": "/resources", "icon": "Download"},
            {"id": "ql-6", "title": "Contact Us", "description": "Office hours, map and enquiry form", "href": "/contact", "icon": "Phone"},
        ],
        "statistics": [
            {"id": "st-1", "label": "Students", "value": 860, "suffix": "+", "visible": True, "order": 1},
            {"id": "st-2", "label": "Teachers", "value": 62, "visible": True, "order": 2},
            {"id": "st-3", "label": "Academic programmes", "value": 7, "visible": True, "order": 3},
            {"id": "st-4", "label": "Clubs & societies", "value": 18, "visible": True, "order": 4},
            {"id": "st-5", "label": "CSEC subjects offered", "value": 28, "visible": True, "order": 5},
            {"id": "st-6", "label": "Years serving the community", "value": 58, "visible": True, "order": 6},
        ],
        "values": [
            {"title": "Excellence", "description": "We pursue high standards in teaching, learning, sport and service — not as a slogan, but as daily practice."},
            {"title": "Integrity", "description": "Students and staff are expected to be honest, fair and accountable, in and out of uniform."},
            {"title": "Responsibility", "description": "Every Bel-Air student is trusted to take ownership of work, conduct and contribution to the school."},
            {"title": "Respect", "description": "We honour one another, our campus, and the wider Mandeville community we serve."},
        ],
        "principal": {
            "name": "Dr Donnalyn King",
            "title": "Principal",
            "photo": PHOTO["principal"],
            "excerpt": "Welcome to Bel-Air High School. We are a community that believes every student can achieve, provided they are known, challenged and supported.",
            "messageTitle": "Welcome to Bel-Air High School",
            "paragraphs": [
                "It is my privilege to welcome you to Bel-Air High School, a co-educational institution that has served Mandeville and the parish of Manchester since 1968.",
                "Our mission is clear: to promote the academic, social, emotional and holistic development of our students, and to do so with integrity.",
                "Whether you are a prospective parent, a returning alumnus or a current member of our school family, I invite you to look through these pages and visit us on deCarteret Road.",
                "Unity through friendship and knowledge.",
            ],
            "content": _html([
                "It is my privilege to welcome you to Bel-Air High School, a co-educational institution that has served Mandeville and the parish of Manchester since 1968.",
                "Our mission is clear: to promote the academic, social, emotional and holistic development of our students, and to do so with integrity.",
                "Unity through friendship and knowledge.",
            ]),
            "signature": "Dr Donnalyn King",
        },
        "about": {
            "overview": [
                "Bel-Air High School is a non-denominational, co-educational secondary school located at 43 deCarteret Road, Mandeville. We serve students from Grade 7 to Grade 13, with pathways in CSEC, CAPE and technical-vocational education.",
                "The school sits in the cool hills of Manchester and draws students from Mandeville and surrounding communities.",
            ],
            "history": [
                "Bel-Air High School was established in 1968 to expand access to quality secondary education in Manchester.",
                "Today Bel-Air continues to modernise teaching, strengthen examination performance, and give students a full school life.",
            ],
            "mission": "Bel-Air High School seeks to promote the academic, social, emotional and holistic development of its students.",
            "vision": "To provide the highest quality education for all our students, supported by enthusiastic educators, innovative programming and up-to-date technology.",
            "motto": "Unity Through Friendship and Knowledge",
            "crestExplanation": [
                "Deep green speaks to growth and the Manchester landscape. Gold speaks to excellence and honour.",
            ],
            "achievements": [
                "Consistent CSEC and CAPE entries across a broad subject range.",
                "daCosta Cup football: first school through to the round of 32 in 2024.",
            ],
            "campus": [
                "The campus is located on deCarteret Road in Mandeville, a short distance from the town centre.",
            ],
        },
        "admissions": {
            "intro": [
                "Thank you for considering Bel-Air High School. We admit students who are ready for a structured, ambitious secondary programme.",
            ],
            "requirements": [
                "Primary Exit Profile (PEP) placement to Bel-Air High School, or an approved transfer request.",
                "Age-appropriate placement for the requested grade (Grades 7–13).",
            ],
            "process": [
                {"step": 1, "title": "Review entry requirements", "detail": "Confirm PEP placement, transfer eligibility or sixth-form subject requirements before you begin."},
                {"step": 2, "title": "Gather documents", "detail": "Collect birth certificate, last two reports, PEP/CSEC results, and proof of address."},
                {"step": 3, "title": "Submit application", "detail": "Return the completed form to the school office or email admissions."},
            ],
            "documents": [
                "Completed Bel-Air High School application form",
                "Original and copy of birth certificate",
                "Two most recent school reports",
            ],
            "transfers": [
                "Transfer requests are considered when space exists in the grade and in the student’s subject combination.",
            ],
            "deadlines": [
                {"label": "Grade 7 orientation", "date": "Last week of August"},
                {"label": "Transfer applications (September intake)", "date": "30 June"},
            ],
            "faqs": [
                {"question": "Is Bel-Air High School co-educational?", "answer": "Yes. We admit boys and girls from Grade 7 through Grade 13."},
                {"question": "Do you offer CAPE / sixth form?", "answer": "Yes. Grades 12 and 13 follow CAPE Unit 1 and Unit 2."},
            ],
        },
        "programmes": [
            {"id": "p-belair-1", "slug": "csec", "title": "CSEC", "summary": "A full CXC CSEC programme across the sciences, humanities, business and technical subjects.", "description": "Grades 10 and 11 prepare for the Caribbean Secondary Education Certificate.", "icon": "BookOpen", "href": "/academics#csec", "active": True, "displayOrder": 1},
            {"id": "p-belair-2", "slug": "cape", "title": "CAPE", "summary": "Sixth-form study in Grades 12 and 13.", "description": "Bel-Air’s sixth form offers CAPE Unit 1 and Unit 2.", "icon": "Landmark", "href": "/academics#cape", "active": True, "displayOrder": 2},
            {"id": "p-belair-3", "slug": "tvet", "title": "TVET", "summary": "Technical and vocational pathways.", "description": "TVET subjects give students practical competence alongside the academic curriculum.", "icon": "Wrench", "href": "/academics#tvet", "active": True, "displayOrder": 3},
            {"id": "p-belair-4", "slug": "stem", "title": "STEM", "summary": "Mathematics, sciences and information technology.", "description": "STEM at Bel-Air includes coordinated work among Mathematics, Science and IT.", "icon": "Atom", "href": "/academics/departments/science", "active": True, "displayOrder": 4},
            {"id": "p-belair-5", "slug": "business", "title": "Business", "summary": "Principles of Business, Accounts, Economics and EDPM.", "description": "The Business Department prepares students for CSEC and CAPE business subjects.", "icon": "Briefcase", "href": "/academics/departments/business-education", "active": True, "displayOrder": 5},
            {"id": "p-belair-6", "slug": "humanities", "title": "Humanities", "summary": "English, history, geography, social studies, languages and the arts.", "description": "Humanities teaching develops reading, writing and civic understanding.", "icon": "Globe", "href": "/academics/departments/humanities", "active": True, "displayOrder": 6},
            {"id": "p-belair-7", "slug": "technical", "title": "Technical & Vocational", "summary": "Hands-on programmes that sit alongside the academic curriculum.", "description": "Workshops support drawing, construction, electrical work and related technical subjects.", "icon": "Hammer", "href": "/academics/departments/technical-vocational-education", "active": True, "displayOrder": 7},
        ],
        "clubs": [
            {"id": "c-belair-1", "slug": "computer-club", "name": "Computer Club", "description": "Coding, digital design and support for the school’s technology needs.", "coordinator": "Daniel Scott", "meeting": "Wednesdays, 2:45 p.m. · IT Lab", "image": PHOTO["computers"]},
            {"id": "c-belair-2", "slug": "debate-club", "name": "Debate Club", "description": "Argument, research and public speaking.", "coordinator": "Nicola Brown", "meeting": "Thursdays, 2:45 p.m. · Library", "image": PHOTO["leadership"]},
            {"id": "c-belair-3", "slug": "environmental-club", "name": "Environmental Club", "description": "Campus care, recycling and environmental education.", "coordinator": "Keisha Linton", "meeting": "Tuesdays, 2:45 p.m. · Science block", "image": PHOTO["community"]},
            {"id": "c-belair-4", "slug": "drama-club", "name": "Drama Club", "description": "Performance for assembly, Independence and graduation.", "coordinator": "Kerry-Ann Sutherland", "meeting": "Mondays, 2:45 p.m. · Hall", "image": PHOTO["drama"]},
            {"id": "c-belair-5", "slug": "music-club", "name": "Music Club", "description": "Choir, instrumental groups and items for school ceremonies.", "coordinator": "Music Department", "meeting": "Fridays, 2:30 p.m. · Music room", "image": PHOTO["music"]},
            {"id": "c-belair-6", "slug": "science-club", "name": "Science Club", "description": "Experiments, science fair preparation and STEM outreach.", "coordinator": "Omar Farquharson", "meeting": "Wednesdays, 2:45 p.m. · Lab 2", "image": PHOTO["science"]},
            {"id": "c-belair-7", "slug": "student-council", "name": "Student Council", "description": "Elected student leadership representing forms to the administration.", "coordinator": "Andrea Cole", "meeting": "Alternate Fridays, 2:30 p.m.", "image": PHOTO["leadership"]},
        ],
        "sports": [
            {"id": "sp-belair-1", "slug": "football", "name": "Football", "overview": "Boys’ football competes in the ISSA daCosta Cup.", "coach": "Football coaching staff", "image": PHOTO["football"]},
            {"id": "sp-belair-2", "slug": "netball", "name": "Netball", "overview": "Girls’ netball trains for ISSA and inter-school fixtures.", "coach": "Tamara Johnson", "image": PHOTO["netball"]},
            {"id": "sp-belair-3", "slug": "track-and-field", "name": "Track & Field", "overview": "The track programme feeds Sports Day and selected ISSA championships.", "coach": "Physical Education Department", "image": PHOTO["sports"]},
            {"id": "sp-belair-4", "slug": "basketball", "name": "Basketball", "overview": "Basketball is offered as a school sport with training for interested students.", "coach": "PE Department", "image": PHOTO["basketball"]},
            {"id": "sp-belair-5", "slug": "cricket", "name": "Cricket", "overview": "Cricket continues as part of the school’s sporting offer.", "coach": "PE Department", "image": PHOTO["cricket"]},
            {"id": "sp-belair-6", "slug": "volleyball", "name": "Volleyball", "overview": "Volleyball is played in PE and as a club sport.", "coach": "PE Department", "image": PHOTO["volleyball"]},
        ],
        "houses": [
            {"id": "h-belair-1", "name": "Unity House", "colour": "#0B3D2E", "motto": "Together we rise", "description": "Named for the first word of the school motto."},
            {"id": "h-belair-2", "name": "Friendship House", "colour": "#C9A400", "motto": "Strength in fellowship", "description": "Friendship House champions pastoral care and school spirit."},
            {"id": "h-belair-3", "name": "Knowledge House", "colour": "#1E4D8C", "motto": "Learn to lead", "description": "Knowledge House celebrates academic honour rolls and scholarship."},
            {"id": "h-belair-4", "name": "Integrity House", "colour": "#7A1F2B", "motto": "Character first", "description": "Integrity House is recognised for conduct and honest effort."},
        ],
    }


def ensure_belair_bundle(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    row = db.query(SiteBundle).filter(SiteBundle.school_id == BELAIR).first()
    defaults = _bundle_defaults()
    if row is None:
        db.add(SiteBundle(school_id=BELAIR, payload=dumps(defaults)))
        return
    payload = loads(row.payload)
    fill_missing(payload, defaults)
    row.payload = dumps(payload)


def ensure_belair_news(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    articles = [
        ("n-belair-1", "dacosta-cup-round-of-32", "Footballers first through to daCosta Cup round of 32",
         "Bel-Air completed a seven-match winning run with a 5–1 result against Mount St Joseph.",
         _html([
             "Bel-Air High became the first school to qualify for the ISSA/Wata daCosta Cup round of 32 after a 5–1 win over Mount St Joseph Catholic in Mandeville.",
             "Five different players scored as the team recorded a seventh straight victory.",
         ]), "Sports", "Sports Department", "2026-08-03", PHOTO["football"], True, True, 1),
        ("n-belair-2", "grade-11-mock-examinations", "Grade 11 mock examinations begin Monday",
         "Candidates should arrive in full uniform with the published timetable.",
         _html([
             "Grade 11 mock examinations begin on Monday. These papers are an important rehearsal for CSEC and will be conducted under examination conditions.",
             "Students must be seated at least fifteen minutes before each paper.",
         ]), "Announcements", "Examination Centre", "2026-08-10", PHOTO["exam"], False, True, 0),
        ("n-belair-3", "honour-roll-summer-term", "Summer term honour roll recognised at assembly",
         "Students from Grades 7 to 13 were commended for academic excellence, improved performance and service to the school.",
         _html(["Last Friday’s assembly recognised students who earned a place on the summer term honour roll."]),
         "Academic", "Academic Board", "2026-07-28", PHOTO["lecture"], False, False, 0),
        ("n-belair-4", "environmental-club-campus-clean-up", "Environmental Club leads campus beautification day",
         "Students planted shade trees along the lower walkway and sorted recyclables from the canteen area.",
         _html(["The Environmental Club organised a Saturday beautification exercise with support from parents."]),
         "Community", "Environmental Club", "2026-07-18", PHOTO["community"], False, False, 0),
        ("n-belair-5", "sixth-form-orientation", "Sixth-form orientation sets the tone for CAPE year",
         "New Grade 12 students met tutors, reviewed subject combinations and heard from current CAPE candidates.",
         _html(["Sixth-form orientation introduced incoming Grade 12 students to the expectations of CAPE study at Bel-Air."]),
         "Academic", "Sixth Form", "2026-07-08", PHOTO["students"], False, False, 0),
        ("n-belair-6", "debate-team-parish-finals", "Debate team advances to parish finals",
         "Bel-Air’s senior team will represent the school in the Manchester finals after a closely contested zonal round.",
         _html(["The senior debate team has advanced to the parish finals following a strong showing in the zonal competition."]),
         "Student Life", "English Department", "2026-06-26", PHOTO["leadership"], False, False, 0),
    ]
    for news_id, slug, title, excerpt, content, category, author, date, image, featured, homepage, priority in articles:
        if db.get(NewsArticle, news_id) is not None or _news_exists(db, slug):
            continue
        db.add(NewsArticle(
            id=news_id, school_id=BELAIR, slug=slug, title=title, excerpt=excerpt, content=content,
            category=category, author=author, date=date, image=image, status="published",
            is_featured=featured, show_on_homepage=homepage, featured_priority=priority,
        ))


def ensure_belair_events(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    events = [
        ("e-belair-1", "sports-day", "Sports Day", "Inter-house track and field at Bel-Air High School.", "2026-10-02",
         {"startTime": "8:30 a.m.", "endTime": "4:00 p.m.", "location": "School field", "category": "Sports", "showOnHomepage": True, "featured": True, "image": PHOTO["sports"]}),
        ("e-belair-2", "grade-11-mock-examinations", "Grade 11 Mock Examinations", "CSEC-style mock papers for Grade 11 candidates.", "2026-08-17",
         {"endDate": "2026-08-28", "startTime": "8:30 a.m.", "location": "Examination rooms", "category": "Examinations", "image": PHOTO["exam"]}),
        ("e-belair-3", "parent-teacher-conference", "Parent-Teacher Conference", "Mid-term conferences for parents of Grades 7–11.", "2026-09-11",
         {"startTime": "1:00 p.m.", "location": "Classroom blocks", "category": "PTA", "image": PHOTO["parents"]}),
        ("e-belair-4", "graduation-ceremony", "Graduation Ceremony", "Valedictory service for Grade 11 and Grade 13.", "2026-11-20",
         {"startTime": "10:00 a.m.", "location": "School auditorium", "category": "Graduation", "image": PHOTO["graduation"]}),
        ("e-belair-5", "pta-general-meeting", "PTA General Meeting", "Termly general meeting.", "2026-09-03",
         {"startTime": "5:30 p.m.", "location": "School hall", "category": "PTA"}),
        ("e-belair-6", "independence-assembly", "Independence Assembly", "Whole-school assembly marking Jamaica’s Independence.", "2026-08-06",
         {"startTime": "8:45 a.m.", "location": "Assembly area", "category": "Student activities", "image": PHOTO["assembly"]}),
    ]
    for event_id, slug, title, description, date, extra in events:
        if db.get(Event, event_id) is not None or _event_exists(db, slug):
            continue
        db.add(Event(id=event_id, school_id=BELAIR, slug=slug, title=title, description=description, date=date, status="published", payload=dumps(extra)))


def ensure_belair_staff(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    people = [
        ("s-belair-1", "Dr Donnalyn King", "Principal", "Administration", {"email": "principal@belairhighschoolja.com", "administration": True, "displayOnWebsite": True, "photo": PHOTO["principal"], "featured": True}),
        ("s-belair-2", "Kerry-Ann Sutherland", "Vice Principal", "Administration", {"email": "vp@belairhighschoolja.com", "administration": True, "displayOnWebsite": True, "photo": PHOTO["vp"], "featured": True}),
        ("s-belair-3", "Marcus Bennett", "Vice Principal", "Administration", {"email": "vp2@belairhighschoolja.com", "administration": True, "displayOnWebsite": True, "photo": PHOTO["t1"]}),
        ("s-belair-4", "Marcia Powell", "Bursar", "Administration", {"email": "bursar@belairhighschoolja.com", "administration": True, "displayOnWebsite": True, "photo": PHOTO["s2"]}),
        ("s-belair-5", "Nicola Brown", "Head of Department", "English", {"email": "english@belairhighschoolja.com", "displayOnWebsite": True, "photo": PHOTO["t5"]}),
        ("s-belair-6", "Kevin Clarke", "Head of Department", "Mathematics", {"email": "maths@belairhighschoolja.com", "displayOnWebsite": True, "photo": PHOTO["t3"]}),
        ("s-belair-7", "Omar Farquharson", "Head of Department", "Science", {"email": "science@belairhighschoolja.com", "displayOnWebsite": True, "photo": PHOTO["s1"]}),
        ("s-belair-8", "Daniel Scott", "Head of Department", "Information Technology", {"email": "it@belairhighschoolja.com", "displayOnWebsite": True, "photo": PHOTO["t3"]}),
    ]
    for staff_id, name, role, department, extra in people:
        if db.get(StaffMember, staff_id) is not None:
            continue
        if db.query(StaffMember).filter(StaffMember.school_id == BELAIR, StaffMember.name == name, StaffMember.role == role).first():
            continue
        db.add(StaffMember(id=staff_id, school_id=BELAIR, name=name, role=role, department=department, status="active", payload=dumps(extra)))


def ensure_belair_departments(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    rows = [
        ("d-belair-1", "english-language-literature", "English Language & Literature", {"overview": "The English Department teaches Language and Literature from Grade 7 through CAPE.", "headOfDepartment": "Nicola Brown", "image": PHOTO["writing"]}),
        ("d-belair-2", "mathematics", "Mathematics", {"overview": "Mathematics is taught as a core subject with pathways to Additional Mathematics and CAPE.", "headOfDepartment": "Kevin Clarke", "image": PHOTO["exam"]}),
        ("d-belair-3", "science", "Science", {"overview": "Integrated Science in the lower school leads to Biology, Chemistry, Physics and related CSEC and CAPE options.", "headOfDepartment": "Omar Farquharson", "image": PHOTO["science"]}),
        ("d-belair-4", "information-technology", "Information Technology", {"overview": "IT teaching covers digital literacy in the lower school and CSEC Information Technology.", "headOfDepartment": "Daniel Scott", "image": PHOTO["computers"]}),
        ("d-belair-5", "business-education", "Business Education", {"overview": "Business Education prepares students for commerce, accounts, economics and office administration.", "headOfDepartment": "Michelle Chin", "image": PHOTO["collaboration"]}),
        ("d-belair-6", "humanities", "Humanities", {"overview": "History, Geography, Social Studies and related civic education.", "headOfDepartment": "Patrick Lewis", "image": PHOTO["hills"]}),
        ("d-belair-7", "technical-vocational-education", "Technical/Vocational Education", {"overview": "Practical subjects that sit beside the academic curriculum.", "headOfDepartment": "Wayne Barrett", "image": PHOTO["lab"]}),
        ("d-belair-8", "physical-education", "Physical Education", {"overview": "PE supports ISSA sport, health education and CSEC Physical Education.", "headOfDepartment": "Tamara Johnson", "image": PHOTO["sports"]}),
    ]
    for dept_id, slug, name, extra in rows:
        if db.get(Department, dept_id) is not None:
            continue
        if db.query(Department).filter(Department.school_id == BELAIR, Department.slug == slug).first():
            continue
        db.add(Department(id=dept_id, school_id=BELAIR, slug=slug, name=name, status="active", payload=dumps(extra)))


def ensure_belair_announcements(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    if db.get(Announcement, "ann-belair-1") is not None:
        return
    existing = db.query(Announcement).filter(Announcement.school_id == BELAIR).all()
    if any("mock examinations" in (row.message or "").lower() for row in existing):
        return
    db.add(Announcement(
        id="ann-belair-1",
        school_id=BELAIR,
        title="Grade 11 Mock Examinations",
        message="Important Notice: Grade 11 Mock Examinations begin Monday.",
        active=True,
        payload=dumps({"linkLabel": "View timetable", "linkHref": "/resources", "dismissible": True, "placement": "bar"}),
    ))


def ensure_belair_documents(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    docs = [
        ("doc-belair-1", "Student Handbook 2025–2026", {"category": "Student Handbook", "fileType": "PDF", "href": "#"}),
        ("doc-belair-2", "Code of Conduct and School Rules", {"category": "School Policies", "fileType": "PDF", "href": "#"}),
        ("doc-belair-3", "Application for Admission", {"category": "Application Forms", "fileType": "PDF", "href": "#"}),
        ("doc-belair-4", "Grade 11 Mock Examination Timetable", {"category": "Examination Timetables", "fileType": "PDF", "href": "#"}),
        ("doc-belair-5", "Academic Calendar 2025–2026", {"category": "Academic Calendars", "fileType": "PDF", "href": "#"}),
        ("doc-belair-6", "Uniform and Grooming Policy", {"category": "School Policies", "fileType": "PDF", "href": "#"}),
    ]
    for doc_id, name, extra in docs:
        if db.get(Document, doc_id) is not None:
            continue
        if db.query(Document).filter(Document.school_id == BELAIR, Document.name == name).first():
            continue
        db.add(Document(id=doc_id, school_id=BELAIR, name=name, status="published", payload=dumps(extra)))


def ensure_belair_gallery(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    albums = [
        ("alb-belair-1", "campus", "Campus", [("g-belair-1", PHOTO["courtyard"], "Campus buildings and walkway"), ("g-belair-2", PHOTO["students"], "Students on campus")]),
        ("alb-belair-2", "teaching", "Teaching and learning", [("g-belair-3", PHOTO["classroom"], "Classroom ready for teaching"), ("g-belair-4", PHOTO["lecture"], "Students in a lesson"), ("g-belair-5", PHOTO["science"], "Science laboratory work")]),
        ("alb-belair-3", "sport", "Sport", [("g-belair-6", PHOTO["football"], "Football training"), ("g-belair-7", PHOTO["sports"], "Track and field")]),
    ]
    for album_id, slug, title, images in albums:
        if db.get(GalleryAlbum, album_id) is not None:
            continue
        if db.query(GalleryAlbum).filter(GalleryAlbum.school_id == BELAIR, GalleryAlbum.slug == slug).first():
            continue
        db.add(GalleryAlbum(id=album_id, school_id=BELAIR, slug=slug, title=title, status="published", payload=dumps({"category": title})))
        db.flush()
        for image_id, src, alt in images:
            if db.get(GalleryImage, image_id) is not None:
                continue
            db.add(GalleryImage(id=image_id, school_id=BELAIR, album_id=album_id, src=src, alt=alt, payload=dumps({"album": title, "albumSlug": slug})))


def ensure_belair_page(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    about = _bundle_defaults()["about"]
    row = db.query(Page).filter(Page.school_id == BELAIR, Page.slug == "about").first()
    if row is None:
        db.add(Page(school_id=BELAIR, slug="about", title="About", body=dumps(about), status="published"))
        return
    body = loads(row.body)
    fill_missing(body, about)
    row.body = dumps(body)


def ensure_belair_sections(db: Session) -> None:
    if db.get(School, BELAIR) is None:
        return
    if db.query(HomepageSection).filter(HomepageSection.school_id == BELAIR).first() is not None:
        return
    for i, (name, variant) in enumerate(SECTIONS_BELAIR):
        db.add(HomepageSection(school_id=BELAIR, section_type=name, position=i, enabled=True, variant=variant))


def ensure_belair(db: Session) -> None:
    ensure_belair_school(db)
    ensure_belair_domains(db)
    ensure_belair_settings(db)
    ensure_belair_admin(db)
    ensure_belair_bundle(db)
    ensure_belair_news(db)
    ensure_belair_events(db)
    ensure_belair_staff(db)
    ensure_belair_departments(db)
    ensure_belair_announcements(db)
    ensure_belair_documents(db)
    ensure_belair_gallery(db)
    ensure_belair_page(db)
    ensure_belair_sections(db)
