"""Initial migration

Revision ID: b57e558cf11f
Revises:
Create Date: 2024-11-11 14:42:05.624237

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b57e558cf11f"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "threads",
        sa.Column("thread_id", sa.String(), nullable=False),
        sa.Column("vlab_id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("update_date", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("thread_id"),
    )
    op.create_table(
        "messages",
        sa.Column("message_id", sa.String(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("thread_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["threads.thread_id"],
        ),
        sa.PrimaryKeyConstraint("message_id"),
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table("messages")
    op.drop_table("threads")
    # ### end Alembic commands ###
