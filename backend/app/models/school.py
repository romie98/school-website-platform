import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


def new_id() -> str:
    return str(uuid.uuid4())


class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    max_admins: Mapped[int] = mapped_column(default=5)
    max_storage_mb: Mapped[int] = mapped_column(default=1024)
    feature_flags: Mapped[str] = mapped_column(Text, default="{}")


class School(Base, TimestampMixin):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    domain: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    custom_domain: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(16), default="#0B3D2E")
    secondary_color: Mapped[str] = mapped_column(String(16), default="#FFD100")
    accent_color: Mapped[str] = mapped_column(String(16), default="#145C45")
    theme: Mapped[str] = mapped_column(String(40), default="classic")
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    subscription_plan_id: Mapped[str | None] = mapped_column(
        ForeignKey("subscription_plans.id"), nullable=True
    )
    subscription_status: Mapped[str] = mapped_column(String(20), default="trial")
    subscription_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    feature_flags: Mapped[str] = mapped_column(Text, default="{}")

    settings: Mapped["SchoolSettings"] = relationship(back_populates="school", uselist=False)
    domains: Mapped[list["SchoolDomain"]] = relationship(back_populates="school")
    users: Mapped[list["User"]] = relationship(back_populates="school")  # noqa: F821


class SchoolDomain(Base, TimestampMixin):
    __tablename__ = "school_domains"
    __table_args__ = (UniqueConstraint("domain", name="uq_school_domain"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    school_id: Mapped[str] = mapped_column(ForeignKey("schools.id"), index=True)
    domain: Mapped[str] = mapped_column(String(255), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)

    school: Mapped[School] = relationship(back_populates="domains")


class SchoolSettings(Base, TimestampMixin):
    __tablename__ = "school_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    school_id: Mapped[str] = mapped_column(ForeignKey("schools.id"), unique=True, index=True)
    school_name: Mapped[str] = mapped_column(String(160))
    short_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    motto: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(16), default="#0B3D2E")
    secondary_color: Mapped[str] = mapped_column(String(16), default="#FFD100")
    accent_color: Mapped[str] = mapped_column(String(16), default="#145C45")
    heading_font: Mapped[str] = mapped_column(String(80), default="Montserrat")
    body_font: Mapped[str] = mapped_column(String(80), default="Inter")
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    principal_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tiktok_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    theme: Mapped[str] = mapped_column(String(40), default="classic")
    hero_style: Mapped[str] = mapped_column(String(40), default="full-image")
    news_layout: Mapped[str] = mapped_column(String(40), default="featured")
    events_layout: Mapped[str] = mapped_column(String(40), default="cards")
    footer_style: Mapped[str] = mapped_column(String(40), default="classic")
    navbar_style: Mapped[str] = mapped_column(String(40), default="classic")
    contact_json: Mapped[str] = mapped_column(Text, default="{}")
    branding_json: Mapped[str] = mapped_column(Text, default="{}")

    school: Mapped[School] = relationship(back_populates="settings")
