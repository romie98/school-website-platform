from typing import Sequence, Union

from alembic import op

revision: str = "0006_tenant_indexes"
down_revision: Union[str, None] = "0005_school_id_not_null"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_school_domains_domain", "school_domains", ["domain"], unique=True)
    op.create_index("uq_school_settings_school_id", "school_settings", ["school_id"], unique=True)
    op.create_index("uq_news_school_slug", "news_articles", ["school_id", "slug"], unique=True)
    op.create_index("uq_events_school_slug", "events", ["school_id", "slug"], unique=True)
    op.create_index("uq_departments_school_slug", "departments", ["school_id", "slug"], unique=True)
    op.create_index("uq_albums_school_slug", "gallery_albums", ["school_id", "slug"], unique=True)
    op.create_index("uq_pages_school_slug", "pages", ["school_id", "slug"], unique=True)
    op.create_index("uq_site_bundles_school_id", "site_bundles", ["school_id"], unique=True)


def downgrade() -> None:
    for name, table in [
        ("uq_site_bundles_school_id", "site_bundles"),
        ("uq_pages_school_slug", "pages"),
        ("uq_albums_school_slug", "gallery_albums"),
        ("uq_departments_school_slug", "departments"),
        ("uq_events_school_slug", "events"),
        ("uq_news_school_slug", "news_articles"),
        ("uq_school_settings_school_id", "school_settings"),
        ("ix_school_domains_domain", "school_domains"),
    ]:
        op.drop_index(name, table_name=table)
