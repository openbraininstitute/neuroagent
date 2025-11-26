"""change_to_response_api

Revision ID: 25cefa8449c6
Revises: 6d8986f38d7b
Create Date: 2025-11-25 16:10:42.083480

"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "25cefa8449c6"
down_revision: Union[str, None] = "6d8986f38d7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove search vector index
    op.drop_index("ix_messages_search_vector", table_name="messages", if_exists=True)

    # Create Parts table
    op.create_table(
        "parts",
        sa.Column("part_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("turn", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "MESSAGE",
                "REASONING",
                "FUNCTION_CALL",
                "FUNCTION_CALL_OUTPUT",
                name="parttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("output", JSONB, nullable=False),
        sa.Column("creation_date", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("part_id"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.message_id"]),
    )

    # Migrate data
    conn = op.get_bind()

    # Get all threads
    threads = conn.execute(
        sa.text("SELECT thread_id FROM threads ORDER BY creation_date")
    ).fetchall()

    for (thread_id,) in threads:
        # Get all messages in this thread ordered by creation_date
        messages = conn.execute(
            sa.text("""
            SELECT message_id, entity, content, creation_date, is_complete
            FROM messages
            WHERE thread_id = :thread_id
            ORDER BY creation_date
        """),
            {"thread_id": thread_id},
        ).fetchall()

        i = 0
        while i < len(messages):
            msg_id, entity, content, creation_date, is_complete = messages[i]

            # Parse content as JSON
            try:
                content_json = json.loads(content)
            except:
                content_json = {"content": content}

            if entity == "USER":
                # Create USER message with one MESSAGE part
                user_text = content_json.get("content", "")
                conn.execute(
                    sa.text("""
                    INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                    VALUES (gen_random_uuid(), :message_id, 0, 0, 'MESSAGE', :output, :creation_date)
                """),
                    {
                        "message_id": msg_id,
                        "output": json.dumps(
                            {
                                "type": "message",
                                "role": "user",
                                "content": [{"type": "input_text", "text": user_text}],
                                "status": "completed",
                            }
                        ),
                        "creation_date": creation_date,
                    },
                )
                i += 1

            elif entity in ("AI_TOOL", "AI_MESSAGE"):
                # Aggregate all AI responses into ONE ASSISTANT message until next USER
                assistant_msg_id = msg_id
                turn = 0
                order_idx = 0
                messages_to_delete = []

                # Loop through all AI messages until we hit a USER message
                while i < len(messages) and messages[i][1] in (
                    "AI_TOOL",
                    "AI_MESSAGE",
                    "TOOL",
                ):
                    curr_msg_id, curr_entity, curr_content, curr_creation_date, _ = (
                        messages[i]
                    )

                    try:
                        curr_content_json = json.loads(curr_content)
                    except:
                        curr_content_json = {"content": curr_content}

                    if curr_entity == "AI_TOOL":
                        # Add reasoning if present
                        reasoning = curr_content_json.get("reasoning", "")
                        if reasoning:
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                                VALUES (gen_random_uuid(), :message_id, :turn, :order_index, 'REASONING', :output, :creation_date)
                            """),
                                {
                                    "message_id": assistant_msg_id,
                                    "turn": turn,
                                    "order_index": order_idx,
                                    "output": json.dumps(
                                        {"type": "reasoning", "content": []}
                                    ),
                                    "creation_date": curr_creation_date,
                                },
                            )
                            order_idx += 1

                        # Add content as MESSAGE if present
                        msg_content = curr_content_json.get("content", "")
                        if msg_content:
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                                VALUES (gen_random_uuid(), :message_id, :turn, :order_index, 'MESSAGE', :output, :creation_date)
                            """),
                                {
                                    "message_id": assistant_msg_id,
                                    "turn": turn,
                                    "order_index": order_idx,
                                    "output": json.dumps(
                                        {
                                            "type": "message",
                                            "role": "assistant",
                                            "content": [
                                                {"type": "text", "text": msg_content}
                                            ],
                                            "status": "completed",
                                        }
                                    ),
                                    "creation_date": curr_creation_date,
                                },
                            )
                            order_idx += 1

                        # Get tool calls
                        tool_calls = conn.execute(
                            sa.text("""
                            SELECT tool_call_id, name, arguments
                            FROM tool_calls
                            WHERE message_id = :message_id
                            ORDER BY tool_call_id
                        """),
                            {"message_id": curr_msg_id},
                        ).fetchall()

                        # Add FUNCTION_CALL parts
                        for tool_call_id, name, arguments in tool_calls:
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                                VALUES (gen_random_uuid(), :message_id, :turn, :order_index, 'FUNCTION_CALL', :output, :creation_date)
                            """),
                                {
                                    "message_id": assistant_msg_id,
                                    "turn": turn,
                                    "order_index": order_idx,
                                    "output": json.dumps(
                                        {
                                            "type": "function_call",
                                            "call_id": tool_call_id,
                                            "name": name,
                                            "arguments": arguments,
                                            "status": "completed",
                                        }
                                    ),
                                    "creation_date": curr_creation_date,
                                },
                            )
                            order_idx += 1

                        if curr_msg_id != assistant_msg_id:
                            messages_to_delete.append(curr_msg_id)
                        i += 1
                        turn += 1

                    elif curr_entity == "TOOL":
                        # Add FUNCTION_CALL_OUTPUT part
                        conn.execute(
                            sa.text("""
                            INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                            VALUES (gen_random_uuid(), :message_id, :turn, :order_index, 'FUNCTION_CALL_OUTPUT', :output, :creation_date)
                        """),
                            {
                                "message_id": assistant_msg_id,
                                "turn": turn,
                                "order_index": order_idx,
                                "output": json.dumps(
                                    {
                                        "type": "function_call_output",
                                        "call_id": curr_content_json.get(
                                            "tool_call_id", ""
                                        ),
                                        "output": curr_content_json.get("content", ""),
                                        "status": "completed",
                                    }
                                ),
                                "creation_date": curr_creation_date,
                            },
                        )
                        order_idx += 1
                        messages_to_delete.append(curr_msg_id)
                        i += 1

                    elif curr_entity == "AI_MESSAGE":
                        # Add reasoning if present
                        reasoning = curr_content_json.get("reasoning", "")
                        if reasoning:
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                                VALUES (gen_random_uuid(), :message_id, :turn, :order_index, 'REASONING', :output, :creation_date)
                            """),
                                {
                                    "message_id": assistant_msg_id,
                                    "turn": turn,
                                    "order_index": order_idx,
                                    "output": json.dumps(
                                        {"type": "reasoning", "content": []}
                                    ),
                                    "creation_date": curr_creation_date,
                                },
                            )
                            order_idx += 1

                        # Add final MESSAGE part
                        msg_content = curr_content_json.get("content", "")
                        conn.execute(
                            sa.text("""
                            INSERT INTO parts (part_id, message_id, turn, order_index, type, output, creation_date)
                            VALUES (gen_random_uuid(), :message_id, :turn, :order_index, 'MESSAGE', :output, :creation_date)
                        """),
                            {
                                "message_id": assistant_msg_id,
                                "turn": turn,
                                "order_index": order_idx,
                                "output": json.dumps(
                                    {
                                        "type": "message",
                                        "role": "assistant",
                                        "content": [
                                            {"type": "text", "text": msg_content}
                                        ],
                                        "status": "completed",
                                    }
                                ),
                                "creation_date": curr_creation_date,
                            },
                        )
                        if curr_msg_id != assistant_msg_id:
                            messages_to_delete.append(curr_msg_id)
                        i += 1

                # Move foreign keys and delete old messages
                for old_msg_id in messages_to_delete:
                    conn.execute(
                        sa.text(
                            "UPDATE tool_calls SET message_id = :new_id WHERE message_id = :old_id"
                        ),
                        {"new_id": assistant_msg_id, "old_id": old_msg_id},
                    )
                    conn.execute(
                        sa.text(
                            "UPDATE token_consumption SET message_id = :new_id WHERE message_id = :old_id"
                        ),
                        {"new_id": assistant_msg_id, "old_id": old_msg_id},
                    )
                    conn.execute(
                        sa.text(
                            "UPDATE tool_selection SET message_id = :new_id WHERE message_id = :old_id"
                        ),
                        {"new_id": assistant_msg_id, "old_id": old_msg_id},
                    )
                    conn.execute(
                        sa.text(
                            "UPDATE complexity_estimation SET message_id = :new_id WHERE message_id = :old_id"
                        ),
                        {"new_id": assistant_msg_id, "old_id": old_msg_id},
                    )
                    conn.execute(
                        sa.text("DELETE FROM messages WHERE message_id = :message_id"),
                        {"message_id": old_msg_id},
                    )
            else:
                # Skip unknown entity types
                i += 1

    # Convert entity column to text temporarily
    op.execute("ALTER TABLE messages ALTER COLUMN entity TYPE text")

    # Update all AI_TOOL and AI_MESSAGE to ASSISTANT
    conn.execute(
        sa.text(
            "UPDATE messages SET entity = 'ASSISTANT' WHERE entity IN ('AI_TOOL', 'AI_MESSAGE')"
        )
    )

    # Drop old enum and create new one
    op.execute("DROP TYPE entity")
    op.execute("CREATE TYPE entity AS ENUM ('USER', 'ASSISTANT')")

    # Convert column back to enum
    op.execute(
        "ALTER TABLE messages ALTER COLUMN entity TYPE entity USING entity::entity"
    )

    # Drop old columns and tables
    op.drop_table("tool_calls")
    op.drop_column("messages", "content")


def downgrade():
    # Drop your table(s)
    op.drop_table("response_parts")

    # Drop the enum type
    # Use execute with text() for raw SQL
    conn = op.get_bind()

    # Check if any tables still use the enum before dropping
    result = conn.execute(
        sa.text("""
            SELECT EXISTS (
                SELECT 1
                FROM pg_attribute a
                JOIN pg_type t ON a.atttypid = t.oid
                WHERE t.typname = 'parttype'
            )
        """)
    ).scalar()

    if not result:
        conn.execute(sa.text("DROP TYPE IF EXISTS parttype"))
