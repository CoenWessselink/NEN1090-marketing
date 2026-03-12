"""phase9 production hardening

Revision ID: 0018_phase9_hardening
Revises: 0017_phase8_tenant_management
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0018_phase9_hardening'
down_revision = '0017_phase8_tenant_management'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('export_jobs', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('export_jobs', sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('export_jobs', sa.Column('error_code', sa.String(length=80), nullable=True))
    op.add_column('export_jobs', sa.Column('error_detail', sa.Text(), nullable=True))
    op.create_table(
        'backup_manifests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('scope', sa.String(length=50), nullable=False, server_default='platform'),
        sa.Column('storage_path', sa.String(length=500), nullable=False),
        sa.Column('checksum', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='created'),
        sa.Column('meta', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_backup_manifests_tenant_id', 'backup_manifests', ['tenant_id'])


def downgrade():
    op.drop_index('ix_backup_manifests_tenant_id', table_name='backup_manifests')
    op.drop_table('backup_manifests')
    op.drop_column('export_jobs', 'error_detail')
    op.drop_column('export_jobs', 'error_code')
    op.drop_column('export_jobs', 'retry_count')
    op.drop_column('export_jobs', 'started_at')
