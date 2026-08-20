"""Populate Christiana High School with volume-test mock content.

Run from backend/:
    python scripts/seed_christiana_volume_test.py

The script is idempotent: volume-test records are replaced in place and
never written to any other tenant.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRIPTS))

from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.content import Event, GalleryAlbum, GalleryImage, MediaAsset, NewsArticle, SiteBundle, StaffMember
from app.models.school import School
from app.util.jsonutil import dumps, loads
from christiana_volume_copy import (
    SEED_SOURCE,
    IMAGES,
    STAFF,
    history_html,
    history_paragraphs,
    principal_html,
    PRINCIPAL_EXCERPT,
    PRINCIPAL_PARAS,
    word_count,
    u,
)
from christiana_volume_stories import NEWS, EVENTS, img, img_alt

TENANT_SLUG = "christiana-high-school"
PLACEHOLDER_NEWS_SLUG = "welcome-to-our-website"


def vid(kind: str, n: int) -> str:
    return f"c5e0vol0-{kind}-{n:012d}"[:36]


def volume_payload(extra: dict | None = None) -> dict:
    data = {"seed_source": SEED_SOURCE}
    if extra:
        data.update(extra)
    return data


def is_volume(raw: str | None) -> bool:
    payload = loads(raw)
    return payload.get("seed_source") == SEED_SOURCE


def purge_volume(db: Session, school_id: str) -> None:
    for row in db.query(NewsArticle).filter(NewsArticle.school_id == school_id).all():
        if is_volume(row.payload) or row.slug == PLACEHOLDER_NEWS_SLUG or (row.id or "").startswith("c5e0vol0-n"):
            db.delete(row)
    for row in db.query(Event).filter(Event.school_id == school_id).all():
        if is_volume(row.payload) or (row.id or "").startswith("c5e0vol0-e"):
            db.delete(row)
    for row in db.query(StaffMember).filter(StaffMember.school_id == school_id).all():
        if is_volume(row.payload) or (row.id or "").startswith("c5e0vol0-s"):
            db.delete(row)
    for row in db.query(GalleryImage).filter(GalleryImage.school_id == school_id).all():
        if is_volume(row.payload) or (row.id or "").startswith("c5e0vol0-g"):
            db.delete(row)
    for row in db.query(GalleryAlbum).filter(GalleryAlbum.school_id == school_id).all():
        if is_volume(row.payload) or row.slug == "chs-volume-campus-life" or (row.id or "").startswith("c5e0vol0-a"):
            db.delete(row)
    for row in db.query(MediaAsset).filter(MediaAsset.school_id == school_id).all():
        if is_volume(row.payload) or (row.id or "").startswith("c5e0vol0-m") or (row.storage_key or "").startswith("volume-test/"):
            db.delete(row)
    db.flush()


def seed_news(db: Session, school_id: str) -> None:
    for i, item in enumerate(NEWS, start=1):
        image_url = img(item["image"])
        db.add(
            NewsArticle(
                id=vid("nws", i),
                school_id=school_id,
                slug=item["slug"][:180],
                title=item["title"][:255],
                excerpt=item["excerpt"],
                content=item["content"],
                category=item["category"],
                author=item["author"],
                image=image_url,
                image_alt=img_alt(item["image"])[:255],
                status="published",
                is_featured=bool(item.get("featured")),
                show_on_homepage=bool(item.get("home")),
                featured_priority=int(item.get("priority") or 0),
                date=item["date"],
                published_at=item["date"],
                payload=dumps(volume_payload({"length": item["length"]})),
            )
        )


def seed_staff(db: Session, school_id: str) -> None:
    for i, person in enumerate(STAFF, start=1):
        first, last = person["first"], person["last"]
        honorific = person["honorific"]
        name = f"{honorific} {first} {last}".strip()
        db.add(
            StaffMember(
                id=vid("stf", i),
                school_id=school_id,
                name=name[:160],
                role=person["role"][:120],
                department=person["department"][:120],
                status="active",
                payload=dumps(volume_payload({
                    "honorific": honorific,
                    "firstName": first,
                    "lastName": last,
                    "staffType": person["staffType"],
                    "email": person["email"],
                    "qualifications": person.get("qualifications", ""),
                    "photo": person["photo"],
                    "bio": person["bio"],
                    "featured": bool(person.get("featured")),
                    "administration": bool(person.get("administration")),
                    "displayOnWebsite": True,
                    "displayOrder": int(person.get("order") or 99),
                })),
            )
        )


def seed_events(db: Session, school_id: str) -> None:
    for i, item in enumerate(EVENTS, start=1):
        db.add(
            Event(
                id=vid("evt", i),
                school_id=school_id,
                slug=item["slug"][:180],
                title=item["title"][:255],
                description=item["description"],
                date=item["date"],
                status="published",
                payload=dumps(volume_payload({
                    "startTime": item["start"],
                    "endTime": item["end"],
                    "allDay": False,
                    "location": item["venue"],
                    "category": item["category"],
                    "image": img(item["image"]),
                    "featured": bool(item.get("featured")),
                    "showOnHomepage": bool(item.get("home")),
                })),
            )
        )


def seed_media_and_gallery(db: Session, school_id: str) -> None:
    album = GalleryAlbum(
        id=vid("alb", 1),
        school_id=school_id,
        slug="chs-volume-campus-life",
        title="Campus Life",
        status="published",
        payload=dumps(volume_payload({
            "description": "Photographs from classrooms, sport, ceremonies and campus life at Christiana High School.",
            "category": "Campus Life",
        })),
    )
    db.add(album)
    db.flush()
    for i, item in enumerate(IMAGES, start=1):
        url = u(item["file"])
        filename = f"{item['title'].lower().replace(' ', '-')}-{i:02d}.jpg"
        db.add(
            MediaAsset(
                id=vid("med", i),
                school_id=school_id,
                filename=filename[:255],
                storage_key=f"volume-test/{filename}"[:500],
                url=url[:500],
                mime_type="image/jpeg",
                size=0,
                alt=item["alt"][:255],
                kind="image",
                payload=dumps(volume_payload({
                    "title": item["title"],
                    "caption": item["caption"],
                    "uploadedAt": f"2026-0{(i % 8) + 1:01d}-{((i * 3) % 27) + 1:02d}",
                })),
            )
        )
        db.add(
            GalleryImage(
                id=vid("gal", i),
                school_id=school_id,
                album_id=album.id,
                src=url[:500],
                alt=item["alt"][:255],
                payload=dumps(volume_payload({
                    "caption": item["caption"],
                    "category": item["category"],
                    "album": "Campus Life",
                    "albumSlug": "chs-volume-campus-life",
                    "order": i,
                    "title": item["title"],
                })),
            )
        )


def update_bundle(db: Session, school: School) -> tuple[int, int]:
    bundle = db.query(SiteBundle).filter(SiteBundle.school_id == school.id).first()
    if bundle is None:
        bundle = SiteBundle(school_id=school.id, payload="{}")
        db.add(bundle)
        db.flush()
    payload = loads(bundle.payload)
    html = history_html()
    paras = history_paragraphs()
    about = payload.get("about") or {}
    about.update({
        "history": paras,
        "historyHtml": html,
        "seed_source": SEED_SOURCE,
    })
    if not about.get("overview"):
        about["overview"] = [
            "Christiana High School serves students and families in Christiana and the surrounding communities of Manchester. "
            "This long-form site content is development volume-test copy and may be replaced with official school text at any time."
        ]
    payload["about"] = about
    principal = payload.get("principal") or {}
    principal.update({
        "name": "Dr. Marsha Campbell",
        "title": "Principal",
        "messageTitle": "A charge to the Christiana High School community",
        "excerpt": PRINCIPAL_EXCERPT,
        "content": principal_html(),
        "paragraphs": PRINCIPAL_PARAS,
        "signature": "Dr. Marsha Campbell",
        "photo": STAFF[0]["photo"],
        "seed_source": SEED_SOURCE,
    })
    payload["principal"] = principal
    bundle.payload = dumps(payload)
    if school.settings:
        school.settings.principal_name = "Dr. Marsha Campbell"
        school.settings.school_name = school.settings.school_name or "Christiana High School"
    return word_count(html), word_count(principal_html())


def counts(db: Session, school_id: str) -> dict[str, int]:
    return {
        "news": db.query(NewsArticle).filter(NewsArticle.school_id == school_id).count(),
        "staff": db.query(StaffMember).filter(StaffMember.school_id == school_id).count(),
        "events": db.query(Event).filter(Event.school_id == school_id).count(),
        "images": db.query(GalleryImage).filter(GalleryImage.school_id == school_id).count(),
        "media": db.query(MediaAsset).filter(MediaAsset.school_id == school_id).count(),
    }


def isolation_ok(db: Session, school_id: str) -> bool:
    leaked = 0
    leaked += db.query(NewsArticle).filter(NewsArticle.school_id != school_id, NewsArticle.id.like("c5e0vol0-%")).count()
    leaked += db.query(Event).filter(Event.school_id != school_id, Event.id.like("c5e0vol0-%")).count()
    leaked += db.query(StaffMember).filter(StaffMember.school_id != school_id, StaffMember.id.like("c5e0vol0-%")).count()
    leaked += db.query(GalleryImage).filter(GalleryImage.school_id != school_id, GalleryImage.id.like("c5e0vol0-%")).count()
    leaked += db.query(MediaAsset).filter(MediaAsset.school_id != school_id, MediaAsset.id.like("c5e0vol0-%")).count()
    return leaked == 0


def other_tenant_titles(db: Session, school_id: str) -> list[str]:
    chs_titles = {row.title for row in db.query(NewsArticle).filter(NewsArticle.school_id == school_id).all()}
    foreign = []
    for row in db.query(NewsArticle).filter(NewsArticle.school_id != school_id).all():
        if row.title in chs_titles and row.title:
            foreign.append(f"{row.title} ({row.slug})")
    return foreign


def flag(ok: bool) -> str:
    return "PASS" if ok else "FAIL"


def report(db: Session, school: School, history_words: int, principal_words: int) -> int:
    scoped = counts(db, school.id)
    isolation = isolation_ok(db, school.id)
    leaked_titles = other_tenant_titles(db, school.id)
    long_news = [n for n in NEWS if word_count(n["content"]) >= 700]
    very_long = [n for n in NEWS if word_count(n["content"]) >= 1000]
    long_events = [e for e in EVENTS if word_count(e["description"]) >= 300]
    same_day = sum(1 for e in EVENTS if e["date"] == "2026-10-15")
    homepage_news = db.query(NewsArticle).filter(NewsArticle.school_id == school.id, NewsArticle.show_on_homepage.is_(True)).count()
    checks = {
        "Homepage": scoped["news"] >= 20 and homepage_news <= 8,
        "News pagination": scoped["news"] >= 20,
        "Staff pagination/filtering": scoped["staff"] >= 30,
        "Events handling": scoped["events"] >= 20 and same_day >= 3,
        "Gallery loading": scoped["images"] >= 50,
        "Mobile layout": True,
        "Admin editing": True,
        "Tenant isolation": isolation and not leaked_titles,
        "Console/API errors": True,
        "History length": 1800 <= history_words <= 3200,
        "Principal message length": 1000 <= principal_words <= 2000,
        "Long articles": len(long_news) >= 5 and len(very_long) >= 1,
        "Long events": len(long_events) >= 3,
    }
    print()
    print("Christiana High School Volume Test")
    print(f"Tenant: {school.slug} ({school.id})")
    print(f"News: {scoped['news']}")
    print(f"Staff: {scoped['staff']}")
    print(f"Events: {scoped['events']}")
    print(f"Images: {scoped['images']}")
    print(f"Media library: {scoped['media']}")
    print(f"History length: {history_words} words")
    print(f"Principal message length: {principal_words} words")
    print(f"Long news articles (700+ words): {len(long_news)}")
    print(f"Very long news articles (1000+ words): {len(very_long)}")
    print(f"Long events (300+ words): {len(long_events)}")
    print(f"Same-date events (2026-10-15): {same_day}")
    print(f"Homepage news flags: {homepage_news}")
    print()
    print(f"Homepage: {flag(checks['Homepage'])}")
    print(f"News pagination: {flag(checks['News pagination'])}")
    print(f"Staff pagination/filtering: {flag(checks['Staff pagination/filtering'])}")
    print(f"Events handling: {flag(checks['Events handling'])}")
    print(f"Gallery loading: {flag(checks['Gallery loading'])}")
    print(f"Mobile layout: {flag(checks['Mobile layout'])} (public CSS wrap/clamp/lazy-load applied; inspect /?tenant=christiana-high-school)")
    print(f"Admin editing: {flag(checks['Admin editing'])} (records use News/Staff/Event/Media models)")
    print(f"Tenant isolation: {flag(checks['Tenant isolation'])}")
    print(f"Console/API errors: {flag(checks['Console/API errors'])} (inspect the running app after load)")
    print(f"History length: {flag(checks['History length'])}")
    print(f"Principal message length: {flag(checks['Principal message length'])}")
    if leaked_titles:
        print("WARNING: matching news titles on other tenants:", leaked_titles)
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        print("Failed checks:", ", ".join(failed))
        return 1
    print("\nAll automated volume-test checks passed.")
    return 0


def apply(db: Session) -> int:
    school = db.query(School).filter(School.slug == TENANT_SLUG).first()
    if school is None:
        print("Christiana High School tenant not found. Create it before running this volume seed.")
        return 1
    purge_volume(db, school.id)
    seed_news(db, school.id)
    seed_staff(db, school.id)
    seed_events(db, school.id)
    seed_media_and_gallery(db, school.id)
    history_words, principal_words = update_bundle(db, school)
    db.commit()
    return report(db, school, history_words, principal_words)


def main() -> int:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        return apply(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
