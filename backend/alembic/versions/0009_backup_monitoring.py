from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_backup_monitoring"
down_revision: Union[str, None] = "0008_audit_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "backup_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("backup_type", sa.String(length=32), nullable=False, server_default="full"),
        sa.Column("environment", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="RUNNING"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("provider", sa.String(length=80), nullable=False, server_default="local"),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=False, server_default=""),
        sa.Column("extra", sa.Text(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_backup_runs_started", "backup_runs", ["started_at"])
    op.create_index("ix_backup_runs_status", "backup_runs", ["status"])
    op.create_index("ix_backup_runs_environment", "backup_runs", ["environment"])

    op.create_table(
        "system_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="ERROR"),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("tenant_id", sa.String(length=36), nullable=True),
        sa.Column("tenant_name", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("service", sa.String(length=40), nullable=False, server_default="api"),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("extra", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("request_id", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("route", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("user_role", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_system_events_created", "system_events", ["created_at"])
    op.create_index("ix_system_events_category", "system_events", ["category"])
    op.create_index("ix_system_events_severity", "system_events", ["severity"])
    op.create_index("ix_system_events_tenant", "system_events", ["tenant_id"])
    op.create_index("ix_system_events_type", "system_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_system_events_type", table_name="system_events")
    op.drop_index("ix_system_events_tenant", table_name="system_events")
    op.drop_index("ix_system_events_severity", table_name="system_events")
    op.drop_index("ix_system_events_category", table_name="system_events")
    op.drop_index("ix_system_events_created", table_name="system_events")
    op.drop_table("system_events")
    op.drop_index("ix_backup_runs_environment", table_name="backup_runs")
    op.drop_index("ix_backup_runs_status", table_name="backup_runs")
    op.drop_index("ix_backup_runs_started", table_name="backup_runs")
    op.drop_table("backup_runs")
