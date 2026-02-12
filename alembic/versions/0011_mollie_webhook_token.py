"""add tenants.webhook_token for billing webhooks

Revision ID: 0011_mollie_webhook_token
Revises: 0010_platform_tenants_payments
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0011_mollie_webhook_token"
down_revision = "0010_platform_tenants_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("webhook_token", sa.String(length=64), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("tenants", "webhook_token")
