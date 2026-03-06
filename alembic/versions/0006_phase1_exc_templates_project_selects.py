"""phase1 exc templates + project selects

Revision ID: 0006_exc_tpl_sel
Revises: 0005_weld_inspections
Create Date: 2026-02-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# NOTE: Alembic stores the current revision string in table `alembic_version`
# with a default column size of VARCHAR(32). Therefore keep revision IDs <= 32
# characters to avoid `StringDataRightTruncation` on Postgres.
revision = "0006_exc_tpl_sel"
down_revision = "0005_weld_inspections"
branch_labels = None
depends_on = None


def upgrade():
    # Settings → inspection templates (per EXC)
    op.create_table(
        "inspection_plan_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("exc_class", sa.String(length=10), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("items_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_inspection_plan_templates_tenant_id", "inspection_plan_templates", ["tenant_id"], unique=False)
    op.create_index("ix_inspection_plan_templates_exc", "inspection_plan_templates", ["tenant_id", "exc_class"], unique=False)

    # Lightweight masterdata (tenant-scoped) for Phase 1 bulk-add
    op.create_table(
        "wps_master",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "code", name="uq_wps_master_code"),
    )
    op.create_index("ix_wps_master_tenant_id", "wps_master", ["tenant_id"], unique=False)

    op.create_table(
        "materials_master",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "code", name="uq_materials_master_code"),
    )
    op.create_index("ix_materials_master_tenant_id", "materials_master", ["tenant_id"], unique=False)

    op.create_table(
        "welders_master",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "code", name="uq_welders_master_code"),
    )
    op.create_index("ix_welders_master_tenant_id", "welders_master", ["tenant_id"], unique=False)

    # Project selections (linking to masterdata)
    op.create_table(
        "project_wps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ref_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wps_master.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("project_id", "ref_id", name="uq_project_wps"),
    )
    op.create_index("ix_project_wps_project_id", "project_wps", ["project_id"], unique=False)
    op.create_index("ix_project_wps_tenant_id", "project_wps", ["tenant_id"], unique=False)

    op.create_table(
        "project_materials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ref_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("materials_master.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("project_id", "ref_id", name="uq_project_materials"),
    )
    op.create_index("ix_project_materials_project_id", "project_materials", ["project_id"], unique=False)
    op.create_index("ix_project_materials_tenant_id", "project_materials", ["tenant_id"], unique=False)

    op.create_table(
        "project_welders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ref_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("welders_master.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("project_id", "ref_id", name="uq_project_welders"),
    )
    op.create_index("ix_project_welders_project_id", "project_welders", ["project_id"], unique=False)
    op.create_index("ix_project_welders_tenant_id", "project_welders", ["tenant_id"], unique=False)


def downgrade():
    op.drop_index("ix_project_welders_tenant_id", table_name="project_welders")
    op.drop_index("ix_project_welders_project_id", table_name="project_welders")
    op.drop_table("project_welders")
    op.drop_index("ix_project_materials_tenant_id", table_name="project_materials")
    op.drop_index("ix_project_materials_project_id", table_name="project_materials")
    op.drop_table("project_materials")
    op.drop_index("ix_project_wps_tenant_id", table_name="project_wps")
    op.drop_index("ix_project_wps_project_id", table_name="project_wps")
    op.drop_table("project_wps")
    op.drop_index("ix_welders_master_tenant_id", table_name="welders_master")
    op.drop_table("welders_master")
    op.drop_index("ix_materials_master_tenant_id", table_name="materials_master")
    op.drop_table("materials_master")
    op.drop_index("ix_wps_master_tenant_id", table_name="wps_master")
    op.drop_table("wps_master")
    op.drop_index("ix_inspection_plan_templates_exc", table_name="inspection_plan_templates")
    op.drop_index("ix_inspection_plan_templates_tenant_id", table_name="inspection_plan_templates")
    op.drop_table("inspection_plan_templates")
