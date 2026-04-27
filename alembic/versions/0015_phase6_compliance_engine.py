"""0015 phase6 compliance engine

Revision ID: 0015_phase6_compliance_engine
Revises: 0014_phase5_backbone
Create Date: 2026-03-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


revision = "0015_phase6_compliance_engine"
down_revision = "0014_phase5_backbone"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "iso5817_reference_defects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("defect_group", sa.String(length=80), nullable=False, server_default="surface"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_severity", sa.String(length=20), nullable=False, server_default="major"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("code", name="uq_iso5817_reference_defect_code"),
    )

    op.create_table(
        "weld_inspection_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weld_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("iso5817_level", sa.String(length=2), nullable=False, server_default="C"),
        sa.Column("acceptance_level", sa.String(length=2), nullable=False, server_default="C"),
        sa.Column("quality_status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("visual_result", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("defect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("open_defect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("repair_required_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted_defect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rejected_defect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reinspection_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("approved_by", sa.String(length=120), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("inspection_id", name="uq_weld_inspection_result"),
    )
    op.create_index("ix_weld_inspection_results_tenant_id", "weld_inspection_results", ["tenant_id"])
    op.create_index("ix_weld_inspection_results_project_id", "weld_inspection_results", ["project_id"])
    op.create_index("ix_weld_inspection_results_weld_id", "weld_inspection_results", ["weld_id"])
    op.create_index("ix_weld_inspection_results_inspection_id", "weld_inspection_results", ["inspection_id"])

    op.add_column("weld_defects", sa.Column("defect_code", sa.String(length=40), nullable=True))
    op.add_column("weld_defects", sa.Column("defect_group", sa.String(length=80), nullable=True))
    op.add_column("weld_defects", sa.Column("location_zone", sa.String(length=80), nullable=True))
    op.add_column("weld_defects", sa.Column("severity", sa.String(length=20), nullable=False, server_default="major"))
    op.add_column("weld_defects", sa.Column("measured_size_mm", sa.Float(), nullable=True))
    op.add_column("weld_defects", sa.Column("permitted_size_mm", sa.Float(), nullable=True))
    op.add_column("weld_defects", sa.Column("repair_required", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("weld_defects", sa.Column("repair_state", sa.String(length=30), nullable=False, server_default="not_required"))
    op.create_index("ix_weld_defects_defect_code", "weld_defects", ["defect_code"])

    op.bulk_insert(
        sa.table(
            "iso5817_reference_defects",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("code", sa.String()),
            sa.column("title", sa.String()),
            sa.column("defect_group", sa.String()),
            sa.column("description", sa.Text()),
            sa.column("default_severity", sa.String()),
            sa.column("is_active", sa.Boolean()),
        ),
        [
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000100"), "code": "100", "title": "Crack", "defect_group": "planar", "description": "Scheurvorming in of nabij de las", "default_severity": "critical", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000201"), "code": "201", "title": "Porosity", "defect_group": "volumetric", "description": "Gasporiën of clusters van porositeit", "default_severity": "major", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000401"), "code": "401", "title": "Lack of fusion", "defect_group": "planar", "description": "Onvoldoende binding / lack of fusion", "default_severity": "critical", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000402"), "code": "402", "title": "Incomplete penetration", "defect_group": "planar", "description": "Onvolledige doorlassing", "default_severity": "critical", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000501"), "code": "501", "title": "Undercut", "defect_group": "surface", "description": "Insnijding langs de lasrand", "default_severity": "major", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000602"), "code": "602", "title": "Excess weld metal", "defect_group": "shape", "description": "Te veel oplas / convexiteit", "default_severity": "minor", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000610"), "code": "610", "title": "Misalignment", "defect_group": "shape", "description": "Misaansluiting / hi-lo", "default_severity": "major", "is_active": True},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000701"), "code": "701", "title": "Spatter / surface irregularity", "defect_group": "surface", "description": "Spatten of onregelmatig lasoppervlak", "default_severity": "minor", "is_active": True},
        ],
    )


def downgrade():
    op.drop_index("ix_weld_defects_defect_code", table_name="weld_defects")
    op.drop_column("weld_defects", "repair_state")
    op.drop_column("weld_defects", "repair_required")
    op.drop_column("weld_defects", "permitted_size_mm")
    op.drop_column("weld_defects", "measured_size_mm")
    op.drop_column("weld_defects", "severity")
    op.drop_column("weld_defects", "location_zone")
    op.drop_column("weld_defects", "defect_group")
    op.drop_column("weld_defects", "defect_code")

    op.drop_index("ix_weld_inspection_results_inspection_id", table_name="weld_inspection_results")
    op.drop_index("ix_weld_inspection_results_weld_id", table_name="weld_inspection_results")
    op.drop_index("ix_weld_inspection_results_project_id", table_name="weld_inspection_results")
    op.drop_index("ix_weld_inspection_results_tenant_id", table_name="weld_inspection_results")
    op.drop_table("weld_inspection_results")
    op.drop_table("iso5817_reference_defects")
