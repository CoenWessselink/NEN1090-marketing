
"""0016 phase7 ce dossier export

Revision ID: 0016_phase7_ce_dossier_export
Revises: 0015_phase6_compliance_engine
Create Date: 2026-03-12

"""
from alembic import op
import sqlalchemy as sa

revision = '0016_phase7_ce_dossier_export'
down_revision = '0015_phase6_compliance_engine'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('export_jobs', sa.Column('bundle_type', sa.String(length=30), nullable=False, server_default='zip'))
    op.add_column('export_jobs', sa.Column('manifest_json', sa.Text(), nullable=True))
    op.add_column('export_jobs', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('export_jobs', 'completed_at')
    op.drop_column('export_jobs', 'manifest_json')
    op.drop_column('export_jobs', 'bundle_type')
