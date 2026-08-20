from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_school_nullable"
down_revision: Union[str, None] = "0002_insert_default_school"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "school_domains",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_table(
        "school_settings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True),
        sa.Column("school_name", sa.String(160), nullable=False),
        sa.Column("short_name", sa.String(80), nullable=True),
        sa.Column("motto", sa.String(255), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("favicon_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(16), nullable=False, server_default="#0B3D2E"),
        sa.Column("secondary_color", sa.String(16), nullable=False, server_default="#FFD100"),
        sa.Column("accent_color", sa.String(16), nullable=False, server_default="#145C45"),
        sa.Column("heading_font", sa.String(80), nullable=False, server_default="Montserrat"),
        sa.Column("body_font", sa.String(80), nullable=False, server_default="Inter"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("principal_name", sa.String(160), nullable=True),
        sa.Column("facebook_url", sa.String(500), nullable=True),
        sa.Column("instagram_url", sa.String(500), nullable=True),
        sa.Column("youtube_url", sa.String(500), nullable=True),
        sa.Column("tiktok_url", sa.String(500), nullable=True),
        sa.Column("theme", sa.String(40), nullable=False, server_default="classic"),
        sa.Column("hero_style", sa.String(40), nullable=False, server_default="full-image"),
        sa.Column("news_layout", sa.String(40), nullable=False, server_default="featured"),
        sa.Column("events_layout", sa.String(40), nullable=False, server_default="cards"),
        sa.Column("footer_style", sa.String(40), nullable=False, server_default="classic"),
        sa.Column("navbar_style", sa.String(40), nullable=False, server_default="classic"),
        sa.Column("contact_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("branding_json", sa.Text(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    def owned(name, extra):
        cols = [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
            *extra,
            *_timestamps(),
        ]
        op.create_table(name, *cols)

    owned("news_articles", [
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(80), nullable=False, server_default="General"),
        sa.Column("author", sa.String(120), nullable=False, server_default=""),
        sa.Column("image", sa.String(500), nullable=False, server_default=""),
        sa.Column("image_alt", sa.String(255), nullable=False, server_default=""),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="published"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("show_on_homepage", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("featured_priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("published_at", sa.String(40), nullable=True),
        sa.Column("date", sa.String(40), nullable=False, server_default=""),
    ])
    owned("events", [
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("date", sa.String(40), nullable=False, server_default=""),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="published"),
    ])
    owned("staff_members", [
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("role", sa.String(120), nullable=False, server_default=""),
        sa.Column("department", sa.String(120), nullable=False, server_default=""),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
    ])
    owned("departments", [
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
    ])
    owned("announcements", [
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    ])
    owned("media_assets", [
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False, server_default="application/octet-stream"),
        sa.Column("size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_by", sa.String(36), nullable=True),
        sa.Column("alt", sa.String(255), nullable=False, server_default=""),
        sa.Column("kind", sa.String(20), nullable=False, server_default="image"),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
    ])
    owned("documents", [
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="published"),
    ])
    owned("gallery_albums", [
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="published"),
    ])
    owned("gallery_images", [
        sa.Column("album_id", sa.String(36), sa.ForeignKey("gallery_albums.id"), nullable=True),
        sa.Column("src", sa.String(500), nullable=False, server_default=""),
        sa.Column("alt", sa.String(255), nullable=False, server_default=""),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
    ])
    owned("homepage_sections", [
        sa.Column("section_type", sa.String(80), nullable=False),
        sa.Column("variant", sa.String(80), nullable=False, server_default="default"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("configuration_json", sa.Text(), nullable=False, server_default="{}"),
    ])
    owned("pages", [
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="published"),
    ])
    owned("site_bundles", [
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
    ])


def downgrade() -> None:
    for name in [
        "site_bundles", "pages", "homepage_sections", "gallery_images", "gallery_albums",
        "documents", "media_assets", "announcements", "departments", "staff_members",
        "events", "news_articles", "users", "school_settings", "school_domains",
    ]:
        op.drop_table(name)
