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
        sa.Column("is_complete", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("part_id"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.message_id"]),
    )
    op.create_index("ix_parts_message_id", "parts", ["message_id"])

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
                    INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                    VALUES (gen_random_uuid(), :message_id, 0, 'MESSAGE', :output, :is_complete)
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
                        "is_complete": is_complete,
                    },
                )
                i += 1

            elif entity in ("AI_TOOL", "AI_MESSAGE"):
                # Aggregate all AI responses into ONE ASSISTANT message until next USER
                assistant_msg_id = msg_id
                order_idx = 0
                messages_to_delete = []

                # Loop through all AI messages until we hit a USER message
                while i < len(messages) and messages[i][1] in (
                    "AI_TOOL",
                    "AI_MESSAGE",
                    "TOOL",
                ):
                    (
                        curr_msg_id,
                        curr_entity,
                        curr_content,
                        curr_creation_date,
                        curr_is_complete,
                    ) = messages[i]

                    try:
                        curr_content_json = json.loads(curr_content)
                    except:
                        curr_content_json = {"content": curr_content}

                    if curr_entity == "AI_TOOL":
                        # Add reasoning if present (only if it's a list)
                        reasoning = curr_content_json.get("reasoning", [])
                        encrypted_reasoning = curr_content_json.get(
                            "encrypted_reasoning", ""
                        )
                        if isinstance(reasoning, list) and reasoning:
                            summary = [
                                {"type": "summary_text", "text": step}
                                for step in reasoning
                            ]
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                                VALUES (gen_random_uuid(), :message_id, :order_index, 'REASONING', :output, :is_complete)
                            """),
                                {
                                    "message_id": assistant_msg_id,
                                    "order_index": order_idx,
                                    "output": json.dumps(
                                        {
                                            "type": "reasoning",
                                            "encrypted_content": encrypted_reasoning,
                                            "summary": summary,
                                        }
                                    ),
                                    "is_complete": curr_is_complete,
                                },
                            )
                            order_idx += 1

                        # Add content as MESSAGE if present
                        msg_content = curr_content_json.get("content", "")
                        if msg_content:
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                                VALUES (gen_random_uuid(), :message_id, :order_index, 'MESSAGE', :output, :is_complete)
                            """),
                                {
                                    "message_id": assistant_msg_id,
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
                                    "is_complete": curr_is_complete,
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
                                INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                                VALUES (gen_random_uuid(), :message_id, :order_index, 'FUNCTION_CALL', :output, :is_complete)
                            """),
                                {
                                    "message_id": assistant_msg_id,
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
                                    "is_complete": curr_is_complete,
                                },
                            )
                            order_idx += 1

                        if curr_msg_id != assistant_msg_id:
                            messages_to_delete.append(curr_msg_id)
                        i += 1

                    elif curr_entity == "TOOL":
                        # Add FUNCTION_CALL_OUTPUT part
                        conn.execute(
                            sa.text("""
                            INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                            VALUES (gen_random_uuid(), :message_id, :order_index, 'FUNCTION_CALL_OUTPUT', :output, :is_complete)
                        """),
                            {
                                "message_id": assistant_msg_id,
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
                                "is_complete": curr_is_complete,
                            },
                        )
                        order_idx += 1
                        messages_to_delete.append(curr_msg_id)
                        i += 1

                    elif curr_entity == "AI_MESSAGE":
                        # Add reasoning if present (only if it's a list)
                        reasoning = curr_content_json.get("reasoning", [])
                        encrypted_reasoning = curr_content_json.get(
                            "encrypted_reasoning", ""
                        )
                        if isinstance(reasoning, list) and reasoning:
                            summary = [
                                {"type": "summary_text", "text": step}
                                for step in reasoning
                            ]
                            conn.execute(
                                sa.text("""
                                INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                                VALUES (gen_random_uuid(), :message_id, :order_index, 'REASONING', :output, :is_complete)
                            """),
                                {
                                    "message_id": assistant_msg_id,
                                    "order_index": order_idx,
                                    "output": json.dumps(
                                        {
                                            "type": "reasoning",
                                            "encrypted_content": encrypted_reasoning,
                                            "summary": summary,
                                        }
                                    ),
                                    "is_complete": curr_is_complete,
                                },
                            )
                            order_idx += 1

                        # Add final MESSAGE part
                        msg_content = curr_content_json.get("content", "")
                        conn.execute(
                            sa.text("""
                            INSERT INTO parts (part_id, message_id, order_index, type, output, is_complete)
                            VALUES (gen_random_uuid(), :message_id, :order_index, 'MESSAGE', :output, :is_complete)
                        """),
                            {
                                "message_id": assistant_msg_id,
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
                                "is_complete": curr_is_complete,
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
            elif entity == "TOOL":
                # TOOL messages are handled within AI_TOOL blocks, skip standalone ones
                i += 1
            else:
                # Skip unknown entity types
                i += 1

    # Convert entity column to text temporarily
    op.execute("ALTER TABLE messages ALTER COLUMN entity TYPE text")

    # Delete TOOL messages (already converted to parts)
    conn.execute(sa.text("DELETE FROM messages WHERE entity = 'TOOL'"))

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
    op.drop_column("messages", "is_complete")


def downgrade():
    conn = op.get_bind()

    # Add back content and is_complete columns
    op.add_column("messages", sa.Column("content", sa.String(), nullable=True))
    op.add_column("messages", sa.Column("is_complete", sa.Boolean(), nullable=True))

    # Recreate tool_calls table
    op.create_table(
        "tool_calls",
        sa.Column("tool_call_id", sa.String(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("arguments", sa.String(), nullable=False),
        sa.Column("validated", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("tool_call_id"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.message_id"]),
    )

    # Convert entity enum back to old format
    op.execute("ALTER TABLE messages ALTER COLUMN entity TYPE text")

    # Migrate data back from Parts to old format (must happen before enum conversion)
    threads = conn.execute(
        sa.text("SELECT thread_id FROM threads ORDER BY creation_date")
    ).fetchall()

    for (thread_id,) in threads:
        messages = conn.execute(
            sa.text("""
            SELECT message_id, entity, creation_date
            FROM messages
            WHERE thread_id = :thread_id
            ORDER BY creation_date
        """),
            {"thread_id": thread_id},
        ).fetchall()

        for msg_id, entity, creation_date in messages:
            if entity == "USER":
                # Get USER message part
                part = conn.execute(
                    sa.text("""
                    SELECT output, is_complete FROM parts
                    WHERE message_id = :message_id AND type = 'MESSAGE'
                    ORDER BY order_index LIMIT 1
                """),
                    {"message_id": msg_id},
                ).fetchone()
                if part:
                    output = (
                        part[0] if isinstance(part[0], dict) else json.loads(part[0])
                    )
                    text = output.get("content", [{}])[0].get("text", "")
                    conn.execute(
                        sa.text(
                            "UPDATE messages SET content = :content, is_complete = :is_complete WHERE message_id = :message_id"
                        ),
                        {
                            "content": json.dumps({"role": "user", "content": text}),
                            "is_complete": part[1],
                            "message_id": msg_id,
                        },
                    )

            elif entity == "ASSISTANT":
                # Get all parts for this message and reconstruct turns
                parts = conn.execute(
                    sa.text("""
                    SELECT type, output
                    FROM parts
                    WHERE message_id = :message_id
                    ORDER BY order_index
                """),
                    {"message_id": msg_id},
                ).fetchall()

                # Group parts by turn (turn boundary = after all FUNCTION_CALL_OUTPUT)
                turns = []
                current_turn = {
                    "reasoning": [],
                    "content": "",
                    "tool_calls": [],
                    "tool_outputs": [],
                    "is_complete": True,
                }

                # Get all parts with is_complete
                parts_with_complete = conn.execute(
                    sa.text("""
                    SELECT type, output, is_complete
                    FROM parts
                    WHERE message_id = :message_id
                    ORDER BY order_index
                """),
                    {"message_id": msg_id},
                ).fetchall()

                prev_is_complete = True
                for idx, (part_type, output, is_complete_part) in enumerate(
                    parts_with_complete
                ):
                    output_json = (
                        output if isinstance(output, dict) else json.loads(output)
                    )

                    # Check if we need to start a new turn due to is_complete change
                    if idx > 0 and not prev_is_complete and is_complete_part:
                        # Transition from incomplete to complete - start new turn
                        if any(
                            [
                                current_turn["reasoning"],
                                current_turn["content"],
                                current_turn["tool_calls"],
                            ]
                        ):
                            turns.append(current_turn)
                            current_turn = {
                                "reasoning": [],
                                "content": "",
                                "tool_calls": [],
                                "tool_outputs": [],
                                "is_complete": True,
                            }

                    # Track is_complete for this turn
                    if not is_complete_part:
                        current_turn["is_complete"] = False
                    prev_is_complete = is_complete_part

                    if part_type == "REASONING":
                        summary = output_json.get("summary", [])
                        current_turn["reasoning"] = [s.get("text", "") for s in summary]
                        current_turn["encrypted_reasoning"] = output_json.get(
                            "encrypted_content", ""
                        )
                    elif part_type == "MESSAGE":
                        content = output_json.get("content", [{}])[0].get("text", "")
                        current_turn["content"] = content
                        # Check if next part starts a new turn (MESSAGE without tool calls followed by REASONING/MESSAGE)
                        if not current_turn["tool_calls"] and idx + 1 < len(
                            parts_with_complete
                        ):
                            next_type = parts_with_complete[idx + 1][0]
                            if next_type in ("REASONING", "MESSAGE"):
                                turns.append(current_turn)
                                current_turn = {
                                    "reasoning": [],
                                    "content": "",
                                    "tool_calls": [],
                                    "tool_outputs": [],
                                    "is_complete": True,
                                }
                    elif part_type == "FUNCTION_CALL":
                        # If current turn already has tool outputs, this is a new turn
                        if current_turn["tool_outputs"]:
                            turns.append(current_turn)
                            current_turn = {
                                "reasoning": [],
                                "content": "",
                                "tool_calls": [],
                                "tool_outputs": [],
                                "is_complete": True,
                            }
                        current_turn["tool_calls"].append(output_json)
                    elif part_type == "FUNCTION_CALL_OUTPUT":
                        current_turn["tool_outputs"].append(output_json)
                        # Check if next part starts a new turn (REASONING or MESSAGE after outputs)
                        if idx + 1 < len(parts_with_complete):
                            next_type = parts_with_complete[idx + 1][0]
                            if next_type in ("REASONING", "MESSAGE"):
                                turns.append(current_turn)
                                current_turn = {
                                    "reasoning": [],
                                    "content": "",
                                    "tool_calls": [],
                                    "tool_outputs": [],
                                    "is_complete": True,
                                }

                # Add last turn if it has content
                if any(
                    [
                        current_turn["reasoning"],
                        current_turn["content"],
                        current_turn["tool_calls"],
                    ]
                ):
                    turns.append(current_turn)

                # If no turns were created, convert to AI_MESSAGE with empty content
                if not turns:
                    # Get is_complete from last part if any
                    last_part = conn.execute(
                        sa.text("""
                        SELECT is_complete FROM parts
                        WHERE message_id = :message_id
                        ORDER BY order_index DESC LIMIT 1
                    """),
                        {"message_id": msg_id},
                    ).fetchone()
                    is_complete_val = last_part[0] if last_part else True
                    conn.execute(
                        sa.text(
                            "UPDATE messages SET entity = 'AI_MESSAGE', content = :content, is_complete = :is_complete WHERE message_id = :message_id"
                        ),
                        {
                            "content": json.dumps(
                                {
                                    "content": "",
                                    "reasoning": [],
                                    "sender": "Agent",
                                    "role": "assistant",
                                    "function_call": None,
                                    "tool_calls": [],
                                }
                            ),
                            "is_complete": is_complete_val,
                            "message_id": msg_id,
                        },
                    )
                    continue

                # Create separate messages for each turn
                first_turn = True
                turn_offset = 0
                for turn_data in turns:
                    if turn_data["tool_calls"]:
                        # AI_TOOL message
                        if first_turn:
                            # Update existing message
                            tool_calls_array = [
                                {
                                    "id": tc["call_id"],
                                    "type": "function",
                                    "function": {
                                        "name": tc["name"],
                                        "arguments": tc["arguments"],
                                    },
                                }
                                for tc in turn_data["tool_calls"]
                            ]
                            content = {
                                "content": turn_data["content"],
                                "reasoning": turn_data["reasoning"],
                                "sender": "Agent",
                                "role": "assistant",
                                "function_call": None,
                                "tool_calls": tool_calls_array,
                            }
                            if "encrypted_reasoning" in turn_data:
                                content["encrypted_reasoning"] = turn_data[
                                    "encrypted_reasoning"
                                ]
                            conn.execute(
                                sa.text(
                                    "UPDATE messages SET entity = 'AI_TOOL', content = :content, is_complete = :is_complete WHERE message_id = :message_id"
                                ),
                                {
                                    "content": json.dumps(content),
                                    "is_complete": turn_data["is_complete"],
                                    "message_id": msg_id,
                                },
                            )
                            # Recreate tool_calls
                            for tc in turn_data["tool_calls"]:
                                conn.execute(
                                    sa.text("""
                                    INSERT INTO tool_calls (tool_call_id, message_id, name, arguments)
                                    VALUES (:tool_call_id, :message_id, :name, :arguments)
                                """),
                                    {
                                        "tool_call_id": tc["call_id"],
                                        "message_id": msg_id,
                                        "name": tc["name"],
                                        "arguments": tc["arguments"],
                                    },
                                )
                            turn_offset += 1
                            first_turn = False
                        else:
                            # Create new AI_TOOL message
                            new_msg_id = conn.execute(
                                sa.text("SELECT gen_random_uuid()")
                            ).scalar()
                            tool_calls_array = [
                                {
                                    "id": tc["call_id"],
                                    "type": "function",
                                    "function": {
                                        "name": tc["name"],
                                        "arguments": tc["arguments"],
                                    },
                                }
                                for tc in turn_data["tool_calls"]
                            ]
                            content = {
                                "content": turn_data["content"],
                                "reasoning": turn_data["reasoning"],
                                "sender": "Agent",
                                "role": "assistant",
                                "function_call": None,
                                "tool_calls": tool_calls_array,
                            }
                            if "encrypted_reasoning" in turn_data:
                                content["encrypted_reasoning"] = turn_data[
                                    "encrypted_reasoning"
                                ]
                            conn.execute(
                                sa.text("""
                                INSERT INTO messages (message_id, thread_id, entity, content, creation_date, is_complete)
                                VALUES (:new_id, :thread_id, 'AI_TOOL', :content, :creation_date + INTERVAL ':offset milliseconds', :is_complete)
                            """),
                                {
                                    "new_id": new_msg_id,
                                    "thread_id": conn.execute(
                                        sa.text(
                                            "SELECT thread_id FROM messages WHERE message_id = :msg_id"
                                        ),
                                        {"msg_id": msg_id},
                                    ).scalar(),
                                    "content": json.dumps(content),
                                    "creation_date": creation_date,
                                    "offset": turn_offset,
                                    "is_complete": turn_data["is_complete"],
                                },
                            )
                            turn_offset += 1
                            for tc in turn_data["tool_calls"]:
                                conn.execute(
                                    sa.text("""
                                    INSERT INTO tool_calls (tool_call_id, message_id, name, arguments)
                                    VALUES (:tool_call_id, :message_id, :name, :arguments)
                                """),
                                    {
                                        "tool_call_id": tc["call_id"],
                                        "message_id": new_msg_id,
                                        "name": tc["name"],
                                        "arguments": tc["arguments"],
                                    },
                                )

                        # Create TOOL messages for outputs
                        for tool_output in turn_data["tool_outputs"]:
                            tool_msg_id = conn.execute(
                                sa.text("SELECT gen_random_uuid()")
                            ).scalar()
                            # Get tool name from tool_calls
                            tool_name = next(
                                (
                                    tc["name"]
                                    for tc in turn_data["tool_calls"]
                                    if tc["call_id"] == tool_output["call_id"]
                                ),
                                "",
                            )
                            conn.execute(
                                sa.text("""
                                INSERT INTO messages (message_id, thread_id, entity, content, creation_date, is_complete)
                                VALUES (:new_id, :thread_id, 'TOOL', :content, :creation_date + INTERVAL ':offset milliseconds', :is_complete)
                            """),
                                {
                                    "new_id": tool_msg_id,
                                    "thread_id": conn.execute(
                                        sa.text(
                                            "SELECT thread_id FROM messages WHERE message_id = :msg_id"
                                        ),
                                        {"msg_id": msg_id},
                                    ).scalar(),
                                    "content": json.dumps(
                                        {
                                            "role": "tool",
                                            "tool_call_id": tool_output["call_id"],
                                            "tool_name": tool_name,
                                            "content": tool_output["output"],
                                        }
                                    ),
                                    "creation_date": creation_date,
                                    "offset": turn_offset,
                                    "is_complete": turn_data["is_complete"],
                                },
                            )
                            turn_offset += 1
                    else:
                        # AI_MESSAGE
                        if first_turn:
                            content = {
                                "content": turn_data["content"],
                                "reasoning": turn_data["reasoning"],
                                "sender": "Agent",
                                "role": "assistant",
                                "function_call": None,
                                "tool_calls": [],
                            }
                            if "encrypted_reasoning" in turn_data:
                                content["encrypted_reasoning"] = turn_data[
                                    "encrypted_reasoning"
                                ]
                            conn.execute(
                                sa.text(
                                    "UPDATE messages SET entity = 'AI_MESSAGE', content = :content, is_complete = :is_complete WHERE message_id = :message_id"
                                ),
                                {
                                    "content": json.dumps(content),
                                    "is_complete": turn_data["is_complete"],
                                    "message_id": msg_id,
                                },
                            )
                            turn_offset += 1
                            first_turn = False
                        else:
                            new_msg_id = conn.execute(
                                sa.text("SELECT gen_random_uuid()")
                            ).scalar()
                            content = {
                                "content": turn_data["content"],
                                "reasoning": turn_data["reasoning"],
                                "sender": "Agent",
                                "role": "assistant",
                                "function_call": None,
                                "tool_calls": [],
                            }
                            if "encrypted_reasoning" in turn_data:
                                content["encrypted_reasoning"] = turn_data[
                                    "encrypted_reasoning"
                                ]
                            conn.execute(
                                sa.text("""
                                INSERT INTO messages (message_id, thread_id, entity, content, creation_date, is_complete)
                                VALUES (:new_id, :thread_id, 'AI_MESSAGE', :content, :creation_date + INTERVAL ':offset milliseconds', :is_complete)
                            """),
                                {
                                    "new_id": new_msg_id,
                                    "thread_id": conn.execute(
                                        sa.text(
                                            "SELECT thread_id FROM messages WHERE message_id = :msg_id"
                                        ),
                                        {"msg_id": msg_id},
                                    ).scalar(),
                                    "content": json.dumps(content),
                                    "creation_date": creation_date,
                                    "offset": turn_offset,
                                    "is_complete": turn_data["is_complete"],
                                },
                            )
                            turn_offset += 1

    # Now convert entity column back to enum
    # Column is already text from earlier, drop new enum and create old enum
    op.execute("DROP TYPE IF EXISTS entity")
    op.execute("CREATE TYPE entity AS ENUM ('USER', 'AI_TOOL', 'TOOL', 'AI_MESSAGE')")
    op.execute(
        "ALTER TABLE messages ALTER COLUMN entity TYPE entity USING entity::entity"
    )

    # Drop parts table
    op.drop_table("parts")

    # Drop parttype enum
    conn.execute(sa.text("DROP TYPE IF EXISTS parttype"))

    # Recreate search vector index
    op.execute("""
        CREATE INDEX ix_messages_search_vector ON messages
        USING gin(to_tsvector('english', content))
    """)
