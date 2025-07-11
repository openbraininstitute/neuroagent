"""Switch to uuid

Revision ID: 529e44b33a67
Revises: 52d7f4485020
Create Date: 2025-06-18 11:17:07.130078

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "529e44b33a67"
down_revision: Union[str, None] = "52d7f4485020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    # Temporarily drop foreign key constraints to avoid constraint violations during data transformation
    op.drop_constraint("messages_thread_id_fkey", "messages", type_="foreignkey")
    op.drop_constraint("tool_calls_message_id_fkey", "tool_calls", type_="foreignkey")

    # Format the hex UUIDs to proper UUID format for thread_id and message_id fields
    # Format: insert dashes at positions 8, 12, 16, 20 in the 32-character hex string

    # Update threads table first - format thread_id
    op.execute("""
        UPDATE threads
        SET thread_id = CONCAT(
            SUBSTRING(thread_id, 1, 8), '-',
            SUBSTRING(thread_id, 9, 4), '-',
            SUBSTRING(thread_id, 13, 4), '-',
            SUBSTRING(thread_id, 17, 4), '-',
            SUBSTRING(thread_id, 21, 12)
        )
        WHERE LENGTH(thread_id) = 32 AND thread_id NOT LIKE '%-%'
    """)

    # Update messages table - format thread_id and message_id
    op.execute("""
        UPDATE messages
        SET thread_id = CONCAT(
            SUBSTRING(thread_id, 1, 8), '-',
            SUBSTRING(thread_id, 9, 4), '-',
            SUBSTRING(thread_id, 13, 4), '-',
            SUBSTRING(thread_id, 17, 4), '-',
            SUBSTRING(thread_id, 21, 12)
        )
        WHERE LENGTH(thread_id) = 32 AND thread_id NOT LIKE '%-%'
    """)

    op.execute("""
        UPDATE messages
        SET message_id = CONCAT(
            SUBSTRING(message_id, 1, 8), '-',
            SUBSTRING(message_id, 9, 4), '-',
            SUBSTRING(message_id, 13, 4), '-',
            SUBSTRING(message_id, 17, 4), '-',
            SUBSTRING(message_id, 21, 12)
        )
        WHERE LENGTH(message_id) = 32 AND message_id NOT LIKE '%-%'
    """)

    # Update tool_calls table - format message_id
    op.execute("""
        UPDATE tool_calls
        SET message_id = CONCAT(
            SUBSTRING(message_id, 1, 8), '-',
            SUBSTRING(message_id, 9, 4), '-',
            SUBSTRING(message_id, 13, 4), '-',
            SUBSTRING(message_id, 17, 4), '-',
            SUBSTRING(message_id, 21, 12)
        )
        WHERE LENGTH(message_id) = 32 AND message_id NOT LIKE '%-%'
    """)

    # Now convert the column types to UUID
    op.alter_column(
        "threads",
        "thread_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="thread_id::uuid",
    )
    op.alter_column(
        "threads",
        "vlab_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=True,
        postgresql_using="vlab_id::uuid",
    )
    op.alter_column(
        "threads",
        "project_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=True,
        postgresql_using="project_id::uuid",
    )
    op.alter_column(
        "threads",
        "user_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="user_id::uuid",
    )

    op.alter_column(
        "messages",
        "message_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="message_id::uuid",
    )
    op.alter_column(
        "messages",
        "thread_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="thread_id::uuid",
    )

    op.alter_column(
        "tool_calls",
        "message_id",
        existing_type=sa.VARCHAR(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="message_id::uuid",
    )

    # Recreate foreign key constraints
    op.create_foreign_key(
        "messages_thread_id_fkey", "messages", "threads", ["thread_id"], ["thread_id"]
    )
    op.create_foreign_key(
        "tool_calls_message_id_fkey",
        "tool_calls",
        "messages",
        ["message_id"],
        ["message_id"],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    # Drop foreign key constraints first
    op.drop_constraint("messages_thread_id_fkey", "messages", type_="foreignkey")
    op.drop_constraint("tool_calls_message_id_fkey", "tool_calls", type_="foreignkey")

    # Convert UUID columns back to VARCHAR
    op.alter_column(
        "tool_calls",
        "message_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
        postgresql_using="message_id::text",
    )
    op.alter_column(
        "messages",
        "message_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
        postgresql_using="message_id::text",
    )
    op.alter_column(
        "messages",
        "thread_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
        postgresql_using="thread_id::text",
    )
    op.alter_column(
        "threads",
        "user_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
        postgresql_using="user_id::text",
    )
    op.alter_column(
        "threads",
        "project_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=True,
        postgresql_using="project_id::text",
    )
    op.alter_column(
        "threads",
        "vlab_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=True,
        postgresql_using="vlab_id::text",
    )
    op.alter_column(
        "threads",
        "thread_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
        postgresql_using="thread_id::text",
    )

    # Convert the formatted UUIDs back to hex format (remove dashes) for thread_id and message_id
    # Only do this for fields that were originally hex format

    # Update threads table first - remove dashes from thread_id
    op.execute("""
        UPDATE threads
        SET thread_id = REPLACE(thread_id, '-', '')
    """)

    # Update messages table - remove dashes from thread_id and message_id
    op.execute("""
        UPDATE messages
        SET thread_id = REPLACE(thread_id, '-', '')
    """)

    op.execute("""
        UPDATE messages
        SET message_id = REPLACE(message_id, '-', '')
    """)

    # Update tool_calls table - remove dashes from message_id
    op.execute("""
        UPDATE tool_calls
        SET message_id = REPLACE(message_id, '-', '')
    """)

    # Recreate foreign key constraints
    op.create_foreign_key(
        "messages_thread_id_fkey", "messages", "threads", ["thread_id"], ["thread_id"]
    )
    op.create_foreign_key(
        "tool_calls_message_id_fkey",
        "tool_calls",
        "messages",
        ["message_id"],
        ["message_id"],
    )

    # ### end Alembic commands ###
