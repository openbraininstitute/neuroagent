"""boolean content and tool_calls

Revision ID: 93d2116a8da9
Revises: cf9eedbf9270
Create Date: 2025-01-17 11:14:03.990703

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "93d2116a8da9"
down_revision: Union[str, None] = "cf9eedbf9270"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a new 'messages' table with the updated schema
    role_enum = sa.Enum("USER", "ASSISTANT", "TOOL", name="role")
    # role_enum.create(op.get_bind())

    op.create_table(
        "messages_new",
        sa.Column("message_id", sa.String(), primary_key=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("has_content", sa.Boolean(), nullable=False),
        sa.Column("has_tool_calls", sa.Boolean(), nullable=False),
        sa.Column("payload", sa.String(), nullable=False),
        sa.Column("thread_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["threads.thread_id"],
            name="messages_thread_id_fkey",
            ondelete="CASCADE",
        ),
    )

    # Migrate data from the old 'messages' table to 'messages_new'
    # op.execute('INSERT INTO messages_new (message_id, order, role, has_content, has_tool_calls, payload, thread_id) '
    #            'SELECT message_id, order, role, has_content, has_tool_calls, payload, thread_id FROM messages;')

    op.execute("""
        INSERT INTO messages_new (message_id, "order", creation_date, role, has_content, has_tool_calls, payload, thread_id)
        SELECT
            message_id,
            thread_id,
            "order",
            creation_date,
            CASE
                WHEN entity IN ('USER', 'TOOL') THEN entity
                WHEN entity IN ('AI_TOOL', 'AI_MESSAGE') THEN 'ASSISTANT'
            END AS role,
            CASE
                WHEN entity IN ('USER', 'TOOL', 'AI_MESSAGE') THEN TRUE
                WHEN entity IN ('AI_TOOL') THEN FALSE
            END AS has_content,
            CASE
                WHEN entity = 'AI_TOOL' THEN TRUE
                ELSE FALSE
            END AS has_tool_calls,
            content AS payload
        FROM messages;
    """)

    # Drop the old 'messages' table
    op.drop_table("messages")

    # Rename the new 'messages_new' table to 'messages'
    op.rename_table("messages_new", "messages")

    # Create a new 'tool_calls' table with the updated schema
    op.create_table(
        "tool_calls_new",
        sa.Column("tool_call_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("arguments", sa.String(), nullable=False),
        sa.Column("validated", sa.Boolean(), nullable=True),
        sa.Column("message_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.message_id"],
        ),
        sa.PrimaryKeyConstraint("tool_call_id", name="tool_calls_message_id_fkey"),
    )

    # Migrate data from the old 'tool_calls' table to 'tool_calls_new'
    op.execute(
        "INSERT INTO tool_calls_new (tool_call_id, name, arguments, validated, message_id) "
        "SELECT tool_call_id, name, arguments, validated, message_id FROM tool_calls;"
    )

    # Drop the old 'tool_calls' table
    op.drop_table("tool_calls")

    # Rename the new 'tool_calls_new' table to 'tool_calls'
    op.rename_table("tool_calls_new", "tool_calls")


def downgrade() -> None:
    # Create a new 'messages' table with the previous schema
    op.create_table(
        "messages_old",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("thread_id", sa.Integer, nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("entity", sa.String(length=10), nullable=False),
    )

    # Migrate data from the current 'messages' table to 'messages_old'
    op.execute(
        "INSERT INTO messages_old (id, thread_id, content, entity) "
        "SELECT id, thread_id, content, entity FROM messages;"
    )

    # Drop the current 'messages' table
    op.drop_table("messages")

    # Rename the 'messages_old' table to 'messages'
    op.rename_table("messages_old", "messages")

    # Recreate the foreign key constraint on the 'messages' table
    op.create_foreign_key(None, "messages", ["thread_id"], "threads", ["thread_id"])

    # Create a new 'tool_calls' table with the previous schema
    op.create_table(
        "tool_calls_old",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("message_id", sa.Integer, nullable=False),
        sa.Column("tool_name", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
    )

    # Migrate data from the current 'tool_calls' table to 'tool_calls_old'
    op.execute(
        "INSERT INTO tool_calls_old (id, message_id, tool_name, content) "
        "SELECT id, message_id, tool_name, content FROM tool_calls;"
    )

    # Drop the current 'tool_calls' table
    op.drop_table("tool_calls")

    # Rename the 'tool_calls_old' table to 'tool_calls'
    op.rename_table("tool_calls_old", "tool_calls")

    # Recreate the foreign key constraint on the 'tool_calls' table
    op.create_foreign_key(None, "tool_calls", ["message_id"], "messages", ["id"])

    # Re-enable foreign key checks in SQLite
    op.execute("PRAGMA foreign_keys = ON;")


# def upgrade() -> None:
#     # ### commands auto generated by Alembic - please adjust! ###
#     with op.batch_alter_table('messages', schema=None) as batch_op:
#         role_enum = sa.Enum('USER', 'ASSISTANT', 'TOOL', name='role')
#         role_enum.create(op.get_bind())

#         batch_op.add_column(sa.Column('role', role_enum, nullable=False))
#         batch_op.add_column(sa.Column('has_content', sa.Boolean(), nullable=False))
#         batch_op.add_column(sa.Column('has_tool_calls', sa.Boolean(), nullable=False))
#         batch_op.add_column(sa.Column('payload', sa.String(), nullable=False))
#         batch_op.drop_constraint(None, type_='foreignkey')
#         batch_op.create_foreign_key('messages_thread_id_fkey', 'threads', ['thread_id'], ['thread_id'], ondelete='CASCADE')
#         batch_op.drop_column('entity')
#         batch_op.drop_column('content')

#     with op.batch_alter_table('tool_calls', schema=None) as batch_op:
#         batch_op.drop_constraint(None, type_='foreignkey')
#         batch_op.create_foreign_key('tool_calls_message_id_fkey', 'messages', ['message_id'], ['message_id'], ondelete='CASCADE')

#     # ### end Alembic commands ###


# def downgrade() -> None:
#     # ### commands auto generated by Alembic - please adjust! ###
#     with op.batch_alter_table('tool_calls', schema=None) as batch_op:
#         batch_op.drop_constraint('tool_calls_message_id_fkey', type_='foreignkey')
#         batch_op.create_foreign_key(None, 'messages', ['message_id'], ['message_id'])

#     with op.batch_alter_table('messages', schema=None) as batch_op:
#         batch_op.add_column(sa.Column('content', sa.VARCHAR(), nullable=False))
#         batch_op.add_column(sa.Column('entity', sa.VARCHAR(length=10), nullable=False))
#         batch_op.drop_constraint('messages_thread_id_fkey', type_='foreignkey')
#         batch_op.create_foreign_key(None, 'threads', ['thread_id'], ['thread_id'])
#         batch_op.drop_column('payload')
#         batch_op.drop_column('has_tool_calls')
#         batch_op.drop_column('has_content')
#         batch_op.drop_column('role')

#     # ### end Alembic commands ###
