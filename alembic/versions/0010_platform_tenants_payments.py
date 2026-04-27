"""platform tenant billing fields + payments

Revision ID: 0010_platform_tenants_payments
Revises: 0009_wps_master_fields
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0010_platform_tenants_payments"
down_revision = "0009_wps_master_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend tenants table
    op.add_column("tenants", sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'active'")))
    op.add_column("tenants", sa.Column("trial_until", sa.DateTime(), nullable=True))
    op.add_column("tenants", sa.Column("valid_until", sa.DateTime(), nullable=True))
    op.add_column("tenants", sa.Column("seats_purchased", sa.Integer(), nullable=False, server_default=sa.text("1")))
    op.add_column("tenants", sa.Column("price_per_seat_year_cents", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("tenants", sa.Column("billing_provider", sa.String(length=50), nullable=False, server_default=sa.text("'none'")))
    op.add_column("tenants", sa.Column("mollie_customer_id", sa.String(length=120), nullable=True))
    op.add_column("tenants", sa.Column("mollie_subscription_id", sa.String(length=120), nullable=True))

    # Payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default=sa.text("'manual'")),
        sa.Column("provider_payment_id", sa.String(length=120), nullable=False, server_default=sa.text("''")),
        sa.Column("type", sa.String(length=50), nullable=False, server_default=sa.text("'subscription'")),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default=sa.text("'EUR'")),
        sa.Column("status", sa.String(length=30), nullable=False, server_default=sa.text("'created'")),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("meta", sa.Text(), nullable=False, server_default=sa.text("'{}'")),
        sa.UniqueConstraint("provider", "provider_payment_id", name="uq_payment_provider_pid"),
    )
    op.create_index("ix_payments_tenant_id", "payments", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_payments_tenant_id", table_name="payments")
    op.drop_table("payments")

    op.drop_column("tenants", "mollie_subscription_id")
    op.drop_column("tenants", "mollie_customer_id")
    op.drop_column("tenants", "billing_provider")
    op.drop_column("tenants", "price_per_seat_year_cents")
    op.drop_column("tenants", "seats_purchased")
    op.drop_column("tenants", "valid_until")
    op.drop_column("tenants", "trial_until")
    op.drop_column("tenants", "status")
