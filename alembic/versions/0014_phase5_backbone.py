"""phase 5 backbone tables and assembly linkage

Revision ID: 0014_phase5_backbone
Revises: 0013_pending_seats_fields
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0014_phase5_backbone'
down_revision = '0013_pending_seats_fields'
branch_labels = None
depends_on = None


UUID = postgresql.UUID(as_uuid=True)


def upgrade():
    op.create_table(
        'assemblies',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', UUID, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('drawing_no', sa.String(length=120), nullable=True),
        sa.Column('revision', sa.String(length=40), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='open'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_assemblies_tenant_id', 'assemblies', ['tenant_id'])
    op.create_index('ix_assemblies_project_id', 'assemblies', ['project_id'])
    op.create_index('ix_assemblies_code', 'assemblies', ['code'])

    op.add_column('welds', sa.Column('assembly_id', UUID, sa.ForeignKey('assemblies.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_welds_assembly_id', 'welds', ['assembly_id'])

    op.create_table(
        'material_records',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', UUID, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assembly_id', UUID, sa.ForeignKey('assemblies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('heat_no', sa.String(length=120), nullable=True),
        sa.Column('material_grade', sa.String(length=120), nullable=False),
        sa.Column('profile', sa.String(length=120), nullable=True),
        sa.Column('dimensions', sa.String(length=120), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('certificate_no', sa.String(length=120), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='available'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_material_records_tenant_id', 'material_records', ['tenant_id'])
    op.create_index('ix_material_records_project_id', 'material_records', ['project_id'])
    op.create_index('ix_material_records_assembly_id', 'material_records', ['assembly_id'])

    op.create_table(
        'welder_profiles',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('employee_no', sa.String(length=50), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('process_scope', sa.String(length=120), nullable=True),
        sa.Column('qualification', sa.String(length=120), nullable=True),
        sa.Column('certificate_no', sa.String(length=120), nullable=True),
        sa.Column('certificate_valid_until', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_welder_profiles_tenant_id', 'welder_profiles', ['tenant_id'])

    op.create_table(
        'wps_records',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(length=120), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('process', sa.String(length=50), nullable=True),
        sa.Column('base_material', sa.String(length=120), nullable=True),
        sa.Column('filler_material', sa.String(length=120), nullable=True),
        sa.Column('thickness_range', sa.String(length=120), nullable=True),
        sa.Column('revision', sa.String(length=40), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_wps_records_tenant_id', 'wps_records', ['tenant_id'])
    op.create_index('ix_wps_records_code', 'wps_records', ['code'])

    op.create_table(
        'wpqr_records',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(length=120), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('process', sa.String(length=50), nullable=True),
        sa.Column('test_standard', sa.String(length=120), nullable=True),
        sa.Column('result', sa.String(length=30), nullable=False, server_default='approved'),
        sa.Column('revision', sa.String(length=40), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_wpqr_records_tenant_id', 'wpqr_records', ['tenant_id'])
    op.create_index('ix_wpqr_records_code', 'wpqr_records', ['code'])

    op.create_table(
        'ndt_records',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', UUID, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assembly_id', UUID, sa.ForeignKey('assemblies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('weld_id', UUID, sa.ForeignKey('welds.id', ondelete='SET NULL'), nullable=True),
        sa.Column('method', sa.String(length=30), nullable=False),
        sa.Column('inspection_date', sa.Date(), nullable=True),
        sa.Column('result', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('report_no', sa.String(length=120), nullable=True),
        sa.Column('inspector', sa.String(length=120), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_ndt_records_tenant_id', 'ndt_records', ['tenant_id'])
    op.create_index('ix_ndt_records_project_id', 'ndt_records', ['project_id'])
    op.create_index('ix_ndt_records_assembly_id', 'ndt_records', ['assembly_id'])
    op.create_index('ix_ndt_records_weld_id', 'ndt_records', ['weld_id'])

    op.create_table(
        'export_jobs',
        sa.Column('id', UUID, primary_key=True, nullable=False),
        sa.Column('tenant_id', UUID, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', UUID, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('export_type', sa.String(length=50), nullable=False, server_default='ce_dossier'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='queued'),
        sa.Column('requested_by', sa.String(length=120), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_export_jobs_tenant_id', 'export_jobs', ['tenant_id'])
    op.create_index('ix_export_jobs_project_id', 'export_jobs', ['project_id'])


def downgrade():
    op.drop_index('ix_export_jobs_project_id', table_name='export_jobs')
    op.drop_index('ix_export_jobs_tenant_id', table_name='export_jobs')
    op.drop_table('export_jobs')

    op.drop_index('ix_ndt_records_weld_id', table_name='ndt_records')
    op.drop_index('ix_ndt_records_assembly_id', table_name='ndt_records')
    op.drop_index('ix_ndt_records_project_id', table_name='ndt_records')
    op.drop_index('ix_ndt_records_tenant_id', table_name='ndt_records')
    op.drop_table('ndt_records')

    op.drop_index('ix_wpqr_records_code', table_name='wpqr_records')
    op.drop_index('ix_wpqr_records_tenant_id', table_name='wpqr_records')
    op.drop_table('wpqr_records')

    op.drop_index('ix_wps_records_code', table_name='wps_records')
    op.drop_index('ix_wps_records_tenant_id', table_name='wps_records')
    op.drop_table('wps_records')

    op.drop_index('ix_welder_profiles_tenant_id', table_name='welder_profiles')
    op.drop_table('welder_profiles')

    op.drop_index('ix_material_records_assembly_id', table_name='material_records')
    op.drop_index('ix_material_records_project_id', table_name='material_records')
    op.drop_index('ix_material_records_tenant_id', table_name='material_records')
    op.drop_table('material_records')

    op.drop_index('ix_welds_assembly_id', table_name='welds')
    op.drop_column('welds', 'assembly_id')

    op.drop_index('ix_assemblies_code', table_name='assemblies')
    op.drop_index('ix_assemblies_project_id', table_name='assemblies')
    op.drop_index('ix_assemblies_tenant_id', table_name='assemblies')
    op.drop_table('assemblies')
