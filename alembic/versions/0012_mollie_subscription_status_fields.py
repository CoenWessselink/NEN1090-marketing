"""add mollie subscription status cache fields

Revision ID: 0012_mollie_subscription_status_fields
Revises: 0011_mollie_webhook_token
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0012_mollie_subscription_status_fields"
down_revision = "0011_mollie_webhook_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("mollie_subscription_status", sa.String(length=50), nullable=True))
    op.add_column("tenants", sa.Column("mollie_next_payment_date", sa.DateTime(), nullable=True))
    op.add_column("tenants", sa.Column("mollie_subscription_status_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "mollie_subscription_status_updated_at")
    op.drop_column("tenants", "mollie_next_payment_date")
    op.drop_column("tenants", "mollie_subscription_status")
