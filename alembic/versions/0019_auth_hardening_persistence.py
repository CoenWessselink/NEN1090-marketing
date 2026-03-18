"""auth hardening persistence

Revision ID: 0019_auth_hardening_persistence
Revises: 0018_phase9_hardening
Create Date: 2026-03-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0019_auth_hardening_persistence'
down_revision = '0018_phase9_hardening'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('jti', sa.String(length=64), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('issued_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'])
    op.create_index('ix_password_reset_tokens_jti', 'password_reset_tokens', ['jti'])
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])
    op.create_index('ix_password_reset_tokens_tenant_id', 'password_reset_tokens', ['tenant_id'])
    op.create_index('ix_password_reset_tokens_email', 'password_reset_tokens', ['email'])

    op.create_table(
        'auth_rate_limit_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('subject_key', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_auth_rate_limit_events_action', 'auth_rate_limit_events', ['action'])
    op.create_index('ix_auth_rate_limit_events_subject_key', 'auth_rate_limit_events', ['subject_key'])
    op.create_index('ix_auth_rate_limit_events_created_at', 'auth_rate_limit_events', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_auth_rate_limit_events_created_at', table_name='auth_rate_limit_events')
    op.drop_index('ix_auth_rate_limit_events_subject_key', table_name='auth_rate_limit_events')
    op.drop_index('ix_auth_rate_limit_events_action', table_name='auth_rate_limit_events')
    op.drop_table('auth_rate_limit_events')

    op.drop_index('ix_password_reset_tokens_email', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_tenant_id', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_user_id', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_jti', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_token_hash', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
