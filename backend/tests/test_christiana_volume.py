from pathlib import Path
import sys

from app.models.content import Event, GalleryImage, MediaAsset, NewsArticle, StaffMember
from app.models.school import School
from app.seed import BELAIR, apply_christiana_sky


def login(client, email, password):
    res = client.post("/api/auth/login", json={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _ensure_christiana(client, db):
    school = db.query(School).filter(School.slug == "christiana-high-school").first()
    if school is None:
        token = login(client, "platform@schoolplatform.com", "platform1968")
        created = client.post("/api/platform/schools", headers=token, json={
            "name": "Christiana High School",
            "slug": "christiana-high-school",
            "theme": "classic",
            "motto": "Our Best Jamaica Hope",
            "adminEmail": "admin@christiana.test",
            "adminPassword": "christiana1968",
        })
        assert created.status_code == 200, created.text
        apply_christiana_sky(db)
        db.commit()
        school = db.query(School).filter(School.slug == "christiana-high-school").first()
    return school


def test_christiana_volume_seed_stays_on_christiana_tenant(client, db):
    scripts = Path(__file__).resolve().parents[1] / "scripts"
    sys.path.insert(0, str(scripts))
    from seed_christiana_volume_test import apply

    school = _ensure_christiana(client, db)
    assert apply(db) == 0

    assert db.query(NewsArticle).filter(NewsArticle.school_id == school.id).count() >= 20
    assert db.query(StaffMember).filter(StaffMember.school_id == school.id).count() >= 30
    assert db.query(Event).filter(Event.school_id == school.id).count() >= 20
    assert db.query(GalleryImage).filter(GalleryImage.school_id == school.id).count() >= 50
    assert db.query(MediaAsset).filter(MediaAsset.school_id == school.id).count() >= 50

    assert db.query(NewsArticle).filter(NewsArticle.school_id == BELAIR, NewsArticle.id.like("c5e0vol0-%")).count() == 0
    assert db.query(StaffMember).filter(StaffMember.school_id == BELAIR, StaffMember.id.like("c5e0vol0-%")).count() == 0
    assert db.query(Event).filter(Event.school_id == BELAIR, Event.id.like("c5e0vol0-%")).count() == 0

    chs = client.get("/api/public/site", params={"tenant": "christiana-high-school"}).json()
    belair = client.get("/api/public/site", headers={"Host": "belairhigh.edu.jm"}).json()
    chs_titles = {item["title"] for item in chs["content"]["news"]}
    belair_titles = {item["title"] for item in belair["content"]["news"]}
    assert "Christiana High Welcomes Students for the New Academic Year" in chs_titles
    assert chs_titles.isdisjoint(belair_titles)
    assert "Dr. Marsha Campbell" in chs["content"]["principal"]["name"]
    assert "Dr Donnalyn King" in belair["content"]["principal"]["name"] or "Donnalyn" in belair["content"]["principal"]["name"]
    assert len(chs["content"]["about"].get("historyHtml") or "") > 1000
    assert len((chs["content"]["principal"].get("excerpt") or "").split()) < 80
