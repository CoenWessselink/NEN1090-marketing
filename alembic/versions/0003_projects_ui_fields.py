"""add Projecten UI fields to projects

Revision ID: 0003_projects_ui_fields
Revises: 0002_domain
Create Date: 2026-02-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0003_projects_ui_fields"
down_revision = "0002_domain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fields used by the existing Projecten UI
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("client_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("execution_class", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("acceptance_class", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # Update default for status to match UI (old default was "new")
    op.alter_column(
        "projects",
        "status",
        existing_type=sa.String(length=30),
        server_default="in_controle",
        existing_nullable=False,
    )

    # Migrate existing rows (if any)
    op.execute("UPDATE projects SET status='in_controle' WHERE status='new'")


def downgrade() -> None:
    # Revert default
    op.alter_column(
        "projects",
        "status",
        existing_type=sa.String(length=30),
        server_default="new",
        existing_nullable=False,
    )

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("locked")
        batch_op.drop_column("acceptance_class")
        batch_op.drop_column("execution_class")
        batch_op.drop_column("client_name")
