from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0017_phase8_tenant_management"
down_revision = "0016_phase7_ce_dossier_export"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tenant_usage_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_date", sa.DateTime(), nullable=False),
        sa.Column("active_users", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("seats_purchased", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("projects_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("welds_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inspections_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("exports_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("storage_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("meta", sa.Text(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_tenant_usage_snapshots_tenant_id", "tenant_usage_snapshots", ["tenant_id"], unique=False)
    op.create_index("ix_tenant_usage_snapshots_snapshot_date", "tenant_usage_snapshots", ["snapshot_date"], unique=False)


def downgrade():
    op.drop_index("ix_tenant_usage_snapshots_snapshot_date", table_name="tenant_usage_snapshots")
    op.drop_index("ix_tenant_usage_snapshots_tenant_id", table_name="tenant_usage_snapshots")
    op.drop_table("tenant_usage_snapshots")
