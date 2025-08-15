"""add ts-vector with trigger

Revision ID: cd5a73ea91db
Revises: 12bd7610cbc2
Create Date: 2025-08-11 15:33:31.774170

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cd5a73ea91db"
down_revision: Union[str, None] = "12bd7610cbc2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the search_vector column
    op.add_column(
        "messages", sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True)
    )

    # Create a function to update the search vector
    op.execute("""
        CREATE OR REPLACE FUNCTION update_messages_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := CASE
                WHEN NEW.entity IN ('USER', 'AI_MESSAGE') THEN
                    to_tsvector('english',
                        COALESCE(
                            CASE
                                WHEN NEW.content::jsonb ? 'content' THEN
                                    NEW.content::jsonb->>'content'
                                ELSE ''
                            END,
                            ''
                        )
                    )
                ELSE to_tsvector('english', '')
            END;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger to automatically update search_vector
    op.execute("""
        CREATE TRIGGER messages_search_vector_trigger
        BEFORE INSERT OR UPDATE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_messages_search_vector();
    """)

    # Update existing rows
    op.execute("""
        UPDATE messages
        SET search_vector = (
            CASE
                WHEN entity IN ('USER', 'AI_MESSAGE') THEN
                    to_tsvector('english',
                        COALESCE(
                            CASE
                                WHEN content::jsonb ? 'content' THEN
                                    content::jsonb->>'content'
                                ELSE ''
                            END,
                            ''
                        )
                    )
                ELSE to_tsvector('english', '')
            END
        )
    """)

    # Create indexes
    op.create_index(
        "ix_messages_search_vector",
        "messages",
        ["search_vector"],
        unique=False,
        postgresql_using="gin",
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index(
        "ix_messages_search_vector", table_name="messages", postgresql_using="gin"
    )

    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS messages_search_vector_trigger ON messages;")
    op.execute("DROP FUNCTION IF EXISTS update_messages_search_vector();")

    # Drop column
    op.drop_column("messages", "search_vector")
