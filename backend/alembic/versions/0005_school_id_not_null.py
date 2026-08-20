from typing import Sequence, Union

from alembic import op

revision: str = "0005_school_id_not_null"
down_revision: Union[str, None] = "0004_assign_default_school"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = [
    "school_domains", "school_settings", "news_articles", "events", "staff_members",
    "departments", "announcements", "media_assets", "documents", "gallery_albums",
    "gallery_images", "homepage_sections", "pages", "site_bundles",
]


def upgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.alter_column("school_id", nullable=False)


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.alter_column("school_id", nullable=True)
