"""add username and is_active to social_accounts

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('social_accounts', sa.Column('username', sa.String(), nullable=True))
    op.add_column('social_accounts', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.create_index('ix_social_accounts_account_id', 'social_accounts', ['account_id'])


def downgrade() -> None:
    op.drop_index('ix_social_accounts_account_id', table_name='social_accounts')
    op.drop_column('social_accounts', 'is_active')
    op.drop_column('social_accounts', 'username')
