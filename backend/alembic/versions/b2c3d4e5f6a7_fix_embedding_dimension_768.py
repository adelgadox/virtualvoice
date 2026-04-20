"""fix embedding dimension to 768 (Gemini text-embedding-004)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-19 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change from vector(1536) to vector(768) — Gemini text-embedding-004 default dims.
    # Column has no production data yet so USING NULL is safe.
    op.execute(
        "ALTER TABLE knowledge_entries "
        "ALTER COLUMN embedding TYPE vector(768) "
        "USING NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE knowledge_entries "
        "ALTER COLUMN embedding TYPE vector(1536) "
        "USING NULL"
    )
