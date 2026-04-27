"""welds ui fields

Revision ID: 0004_welds_ui_fields
Revises: 0003_projects_ui_fields
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0004_welds_ui_fields"
down_revision = "0003_projects_ui_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("welds", sa.Column("process", sa.String(length=20), nullable=True))
    op.add_column("welds", sa.Column("material", sa.String(length=80), nullable=True))
    op.add_column("welds", sa.Column("thickness", sa.String(length=30), nullable=True))
    op.add_column("welds", sa.Column("welders", sa.String(length=255), nullable=True))
    op.add_column("welds", sa.Column("vt_status", sa.String(length=30), nullable=True))
    op.add_column("welds", sa.Column("ndo_status", sa.String(length=30), nullable=True))
    op.add_column("welds", sa.Column("photos", sa.Integer(), server_default="0", nullable=False))
    op.add_column("welds", sa.Column("status", sa.String(length=30), server_default="open", nullable=False))


def downgrade():
    op.drop_column("welds", "status")
    op.drop_column("welds", "photos")
    op.drop_column("welds", "ndo_status")
    op.drop_column("welds", "vt_status")
    op.drop_column("welds", "welders")
    op.drop_column("welds", "thickness")
    op.drop_column("welds", "material")
    op.drop_column("welds", "process")
