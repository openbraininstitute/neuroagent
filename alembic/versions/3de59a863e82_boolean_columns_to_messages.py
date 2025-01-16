"""boolean columns to messages

Revision ID: 3de59a863e82
Revises: cf9eedbf9270
Create Date: 2025-01-14 15:28:44.587960

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3de59a863e82"
down_revision: Union[str, None] = "cf9eedbf9270"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    role_enum = sa.Enum("USER", "ASSISTANT", "TOOL", name="role")
    role_enum.create(op.get_bind())

    op.add_column("messages", sa.Column("role", role_enum, nullable=False))
    op.add_column("messages", sa.Column("has_content", sa.Boolean(), nullable=False))
    op.add_column("messages", sa.Column("has_tool_calls", sa.Boolean(), nullable=False))
    op.add_column("messages", sa.Column("payload", sa.String(), nullable=False))
    op.drop_column("messages", "content")
    op.drop_column("messages", "entity")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "messages", sa.Column("entity", sa.VARCHAR(length=10), nullable=False)
    )
    op.add_column("messages", sa.Column("content", sa.VARCHAR(), nullable=False))
    op.drop_column("messages", "payload")
    op.drop_column("messages", "has_tool_calls")
    op.drop_column("messages", "has_content")
    op.drop_column("messages", "role")
    # ### end Alembic commands ###
