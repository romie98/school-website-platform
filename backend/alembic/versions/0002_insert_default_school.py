from typing import Sequence, Union

from alembic import op

revision: str = "0002_insert_default_school"
down_revision: Union[str, None] = "0001_create_schools"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PLAN_ID = "plan-professional"
SCHOOL_ID = "11111111-1111-1111-1111-111111111111"


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO subscription_plans (id, name, slug, max_admins, max_storage_mb, feature_flags)
        VALUES ('{PLAN_ID}', 'Professional', 'professional', 10, 5120, '{{}}')
        """
    )
    op.execute(
        f"""
        INSERT INTO schools (id, name, slug, domain, custom_domain, primary_color, secondary_color, accent_color, theme, status, subscription_plan_id, subscription_status, feature_flags)
        VALUES ('{SCHOOL_ID}', 'Bel-Air High School', 'belair-high', 'belair.schoolplatform.com', 'belairhigh.edu.jm', '#0B3D2E', '#FFD100', '#145C45', 'classic', 'active', '{PLAN_ID}', 'active', '{{}}')
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM schools WHERE id = '{SCHOOL_ID}'")
    op.execute(f"DELETE FROM subscription_plans WHERE id = '{PLAN_ID}'")
