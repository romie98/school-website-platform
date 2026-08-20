from typing import Sequence, Union

from alembic import op

revision: str = "0004_assign_default_school"
down_revision: Union[str, None] = "0003_add_nullable_school_id_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHOOL_ID = "11111111-1111-1111-1111-111111111111"
TABLES = [
    "school_domains", "school_settings", "news_articles", "events", "staff_members",
    "departments", "announcements", "media_assets", "documents", "gallery_albums",
    "gallery_images", "homepage_sections", "pages", "site_bundles",
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"UPDATE {table} SET school_id = '{SCHOOL_ID}' WHERE school_id IS NULL")


def downgrade() -> None:
    pass
