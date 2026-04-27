"""pending seats scheduling

Revision ID: 0013_pending_seats_fields
Revises: 0012_mollie_subscription_status_fields
Create Date: 2026-02-11

"""

from alembic import op
import sqlalchemy as sa

revision = '0013_pending_seats_fields'
down_revision = '0012_mollie_subscription_status_fields'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tenants', sa.Column('pending_seats', sa.Integer(), nullable=True))
    op.add_column('tenants', sa.Column('pending_seats_effective_at', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('tenants', 'pending_seats_effective_at')
    op.drop_column('tenants', 'pending_seats')
