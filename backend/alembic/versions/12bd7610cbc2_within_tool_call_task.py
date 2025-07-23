"""within tool call task

Revision ID: 12bd7610cbc2
Revises: 02aab0a6eef4
Create Date: 2025-07-18 15:37:04.250534

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "12bd7610cbc2"
down_revision: Union[str, None] = "7122d2f48028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("ALTER TYPE task ADD VALUE IF NOT EXISTS 'CALL_WITHIN_TOOL'")


def downgrade():
    # PostgreSQL doesn't support removing enum values directly
    # Noop shouldn't break anything
    pass
