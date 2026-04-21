"""add token_denylist table

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'token_denylist',
        sa.Column('jti', sa.String(), primary_key=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_token_denylist_expires_at', 'token_denylist', ['expires_at'])


def downgrade() -> None:
    op.drop_index('ix_token_denylist_expires_at', table_name='token_denylist')
    op.drop_table('token_denylist')
