"""0008 ISO 5817 defects (minimal, audit-proof)

Revision ID: 0008_iso5817_defects
Revises: 0007_attachments
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0008_iso5817_defects"
down_revision = "0007_attachments"
branch_labels = None
depends_on = None


def upgrade():
    # tenants: company default iso5817 level
    op.add_column("tenants", sa.Column("iso5817_level", sa.String(length=2), nullable=False, server_default="C"))

    # projects: per-project override
    op.add_column("projects", sa.Column("iso5817_level", sa.String(length=2), nullable=True))

    # weld_defects table
    op.create_table(
        "weld_defects",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weld_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inspection_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),

        sa.Column("iso5817_level_used", sa.String(length=2), nullable=False),
        sa.Column("defect_type", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assessment", sa.String(length=30), nullable=False, server_default="open"),
        sa.Column("evidence_attachment_ids", sa.Text(), nullable=False, server_default="[]"),

        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )

    op.create_index("ix_weld_defects_tenant_id", "weld_defects", ["tenant_id"])
    op.create_index("ix_weld_defects_project_id", "weld_defects", ["project_id"])
    op.create_index("ix_weld_defects_weld_id", "weld_defects", ["weld_id"])
    op.create_index("ix_weld_defects_inspection_id", "weld_defects", ["inspection_id"])


def downgrade():
    op.drop_index("ix_weld_defects_inspection_id", table_name="weld_defects")
    op.drop_index("ix_weld_defects_weld_id", table_name="weld_defects")
    op.drop_index("ix_weld_defects_project_id", table_name="weld_defects")
    op.drop_index("ix_weld_defects_tenant_id", table_name="weld_defects")
    op.drop_table("weld_defects")

    op.drop_column("projects", "iso5817_level")
    op.drop_column("tenants", "iso5817_level")
