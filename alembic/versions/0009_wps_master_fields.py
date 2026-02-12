"""Add WPS/WPQR metadata fields to wps_master.

Revision ID: 0009_wps_master_fields
Revises: 0008_iso5817_defects
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_wps_master_fields"
down_revision = "0008_iso5817_defects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wps_master",
        sa.Column("kind", sa.String(length=10), nullable=False, server_default="WPS"),
    )
    op.add_column(
        "wps_master",
        sa.Column("document_no", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "wps_master",
        sa.Column("version", sa.String(length=50), nullable=True),
    )

    # extra safety backfill (some DBs apply server_default only for new rows)
    op.execute("UPDATE wps_master SET kind = 'WPS' WHERE kind IS NULL")


def downgrade() -> None:
    op.drop_column("wps_master", "version")
    op.drop_column("wps_master", "document_no")
    op.drop_column("wps_master", "kind")
