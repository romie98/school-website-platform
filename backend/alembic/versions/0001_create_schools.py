from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_create_schools"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("max_admins", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_storage_mb", sa.Integer(), nullable=False, server_default="1024"),
        sa.Column("feature_flags", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subscription_plans_slug", "subscription_plans", ["slug"], unique=True)
    op.create_table(
        "schools",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("domain", sa.String(255), nullable=True),
        sa.Column("custom_domain", sa.String(255), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("favicon_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(16), nullable=False, server_default="#0B3D2E"),
        sa.Column("secondary_color", sa.String(16), nullable=False, server_default="#FFD100"),
        sa.Column("accent_color", sa.String(16), nullable=False, server_default="#145C45"),
        sa.Column("theme", sa.String(40), nullable=False, server_default="classic"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("subscription_plan_id", sa.String(36), sa.ForeignKey("subscription_plans.id"), nullable=True),
        sa.Column("subscription_status", sa.String(20), nullable=False, server_default="trial"),
        sa.Column("subscription_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("feature_flags", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_schools_slug", "schools", ["slug"], unique=True)
    op.create_index("ix_schools_domain", "schools", ["domain"], unique=True)
    op.create_index("ix_schools_custom_domain", "schools", ["custom_domain"], unique=True)
    op.create_index("ix_schools_status", "schools", ["status"])


def downgrade() -> None:
    op.drop_table("schools")
    op.drop_table("subscription_plans")
