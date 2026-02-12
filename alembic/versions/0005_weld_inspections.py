"""weld inspections

Revision ID: 0005_weld_inspections
Revises: 0004_welds_ui_fields
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0005_weld_inspections"
down_revision = "0004_welds_ui_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "weld_inspections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weld_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("welds.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inspector", sa.String(length=120), nullable=True),
        sa.Column("inspected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("overall_status", sa.String(length=20), server_default="open", nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "weld_id", name="uq_tenant_weld_inspection"),
    )
    op.create_index("ix_weld_inspections_tenant_id", "weld_inspections", ["tenant_id"], unique=False)
    op.create_index("ix_weld_inspections_project_id", "weld_inspections", ["project_id"], unique=False)
    op.create_index("ix_weld_inspections_weld_id", "weld_inspections", ["weld_id"], unique=False)

    op.create_table(
        "inspection_checks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("weld_inspections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("group_key", sa.String(length=20), server_default="pre", nullable=False),
        sa.Column("criterion_key", sa.String(length=120), nullable=False),
        sa.Column("applicable", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("approved", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("inspection_id", "criterion_key", name="uq_inspection_criterion"),
    )
    op.create_index("ix_inspection_checks_tenant_id", "inspection_checks", ["tenant_id"], unique=False)
    op.create_index("ix_inspection_checks_inspection_id", "inspection_checks", ["inspection_id"], unique=False)


def downgrade():
    op.drop_index("ix_inspection_checks_inspection_id", table_name="inspection_checks")
    op.drop_index("ix_inspection_checks_tenant_id", table_name="inspection_checks")
    op.drop_table("inspection_checks")
    op.drop_index("ix_weld_inspections_weld_id", table_name="weld_inspections")
    op.drop_index("ix_weld_inspections_project_id", table_name="weld_inspections")
    op.drop_index("ix_weld_inspections_tenant_id", table_name="weld_inspections")
    op.drop_table("weld_inspections")
