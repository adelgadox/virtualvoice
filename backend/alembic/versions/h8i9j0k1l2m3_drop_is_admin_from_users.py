"""drop is_admin column from users

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-05-02

is_admin was superseded by the role column (g7h8i9j0k1l2 migration).
No router or dependency reads is_admin anymore — role is the authoritative field.
"""
from alembic import op
import sqlalchemy as sa

revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column('users', 'is_admin')


def downgrade() -> None:
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=True, server_default='false'))
