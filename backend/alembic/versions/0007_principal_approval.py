from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_principal_approval"
down_revision: Union[str, None] = "0006_tenant_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_changes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("resource_type", sa.String(40), nullable=False, index=True),
        sa.Column("resource_id", sa.String(36), nullable=True, index=True),
        sa.Column("action", sa.String(20), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("submitted_by", sa.String(36), nullable=True, index=True),
        sa.Column("submitted_by_name", sa.String(160), nullable=False, server_default=""),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("old_data", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("new_data", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("reviewed_by", sa.String(36), nullable=True),
        sa.Column("reviewed_by_name", sa.String(160), nullable=False, server_default=""),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("supersedes_id", sa.String(36), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_changes_school_status_submitted", "content_changes", ["school_id", "status", "submitted_at"])
    op.create_index("ix_changes_school_resource", "content_changes", ["school_id", "resource_type", "resource_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), nullable=True, index=True),
        sa.Column("user_id", sa.String(36), nullable=True, index=True),
        sa.Column("user_name", sa.String(160), nullable=False, server_default=""),
        sa.Column("user_role", sa.String(32), nullable=False, server_default=""),
        sa.Column("action", sa.String(40), nullable=False, index=True),
        sa.Column("resource_type", sa.String(40), nullable=False, server_default=""),
        sa.Column("resource_id", sa.String(36), nullable=True),
        sa.Column("change_request_id", sa.String(36), nullable=True, index=True),
        sa.Column("data", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_school_created", "audit_events", ["school_id", "created_at"])

    op.create_table(
        "app_notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("school_id", sa.String(36), nullable=False, index=True),
        sa.Column("user_id", sa.String(36), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("href", sa.String(255), nullable=False, server_default=""),
        sa.Column("kind", sa.String(40), nullable=False, server_default="approval"),
        sa.Column("change_request_id", sa.String(36), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_read", "app_notifications", ["user_id", "read_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_read", table_name="app_notifications")
    op.drop_table("app_notifications")
    op.drop_index("ix_audit_school_created", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_changes_school_resource", table_name="content_changes")
    op.drop_index("ix_changes_school_status_submitted", table_name="content_changes")
    op.drop_table("content_changes")
