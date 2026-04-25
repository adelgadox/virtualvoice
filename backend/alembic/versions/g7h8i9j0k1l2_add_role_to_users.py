"""add role column to users

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'g7h8i9j0k1l2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add role column as nullable first
    op.add_column('users', sa.Column('role', sa.String(), nullable=True))
    # Migrate existing data: is_admin=True -> 'admin', else 'user'
    op.execute("UPDATE users SET role = CASE WHEN is_admin = true THEN 'admin' ELSE 'user' END")
    # Make non-nullable
    op.alter_column('users', 'role', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'role')
