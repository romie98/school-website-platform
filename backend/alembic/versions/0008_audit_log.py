from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_audit_log"
down_revision: Union[str, None] = "0007_principal_approval"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audit_events", sa.Column("school_name", sa.String(160), nullable=False, server_default=""))
    op.add_column("audit_events", sa.Column("resource_name", sa.String(255), nullable=False, server_default=""))
    op.add_column("audit_events", sa.Column("old_data", sa.Text(), nullable=False, server_default="{}"))
    op.add_column("audit_events", sa.Column("new_data", sa.Text(), nullable=False, server_default="{}"))
    op.add_column("audit_events", sa.Column("status_before", sa.String(40), nullable=False, server_default=""))
    op.add_column("audit_events", sa.Column("status_after", sa.String(40), nullable=False, server_default=""))
    op.add_column("audit_events", sa.Column("reviewed_by_user_id", sa.String(36), nullable=True))
    op.add_column("audit_events", sa.Column("reviewed_by_name", sa.String(160), nullable=False, server_default=""))
    op.add_column("audit_events", sa.Column("decline_reason", sa.Text(), nullable=False, server_default=""))
    op.create_index("ix_audit_school_action", "audit_events", ["school_id", "action"])
    op.create_index("ix_audit_school_resource_type", "audit_events", ["school_id", "resource_type"])
    op.create_index("ix_audit_school_actor", "audit_events", ["school_id", "user_id"])
    op.create_index("ix_audit_resource", "audit_events", ["resource_type", "resource_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_resource", table_name="audit_events")
    op.drop_index("ix_audit_school_actor", table_name="audit_events")
    op.drop_index("ix_audit_school_resource_type", table_name="audit_events")
    op.drop_index("ix_audit_school_action", table_name="audit_events")
    op.drop_column("audit_events", "decline_reason")
    op.drop_column("audit_events", "reviewed_by_name")
    op.drop_column("audit_events", "reviewed_by_user_id")
    op.drop_column("audit_events", "status_after")
    op.drop_column("audit_events", "status_before")
    op.drop_column("audit_events", "new_data")
    op.drop_column("audit_events", "old_data")
    op.drop_column("audit_events", "resource_name")
    op.drop_column("audit_events", "school_name")
