"""enable pgvector embedding column

Revision ID: a1b2c3d4e5f6
Revises: 7d939e1c7f5b
Create Date: 2026-04-19 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7d939e1c7f5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure pgvector extension is enabled (idempotent)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Replace LargeBinary fallback with native vector(1536) type
    op.execute(
        "ALTER TABLE knowledge_entries "
        "ALTER COLUMN embedding TYPE vector(1536) "
        "USING NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE knowledge_entries "
        "ALTER COLUMN embedding TYPE bytea "
        "USING NULL"
    )
