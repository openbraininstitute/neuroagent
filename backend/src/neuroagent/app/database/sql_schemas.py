"""Schemas for the chatbot."""

import datetime
import enum
import uuid

from sqlalchemy import (
    UUID,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime.datetime:
    """Return the utc time."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class Entity(enum.Enum):
    """Calss to restrict entity collumn."""

    USER = "user"
    AI_TOOL = "ai_tool"
    TOOL = "tool"
    AI_MESSAGE = "ai_message"


class Task(enum.Enum):
    """Type of request that generated token consumption."""

    CHAT_COMPLETION = "chat-completion"
    TOOL_SELECTION = "tool-selection"
    CALL_WITHIN_TOOL = "call-within-tool"


class TokenType(enum.Enum):
    """Type of token consumed."""

    INPUT_NONCACHED = "input-noncached"
    INPUT_CACHED = "input-cached"
    COMPLETION = "completion"


class Base(AsyncAttrs, DeclarativeBase):
    """Base declarative base for SQLAlchemy."""


class Threads(Base):
    """SQL table for the users thread / conversations."""

    __tablename__ = "threads"
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    vlab_id: Mapped[uuid.UUID] = mapped_column(
        UUID, nullable=True
    )  # only default for now !
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID, nullable=True
    )  # only default for now !
    title: Mapped[str] = mapped_column(String, default="New chat")
    creation_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    update_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    messages: Mapped[list["Messages"]] = relationship(
        "Messages",
        back_populates="thread",
        order_by="Messages.creation_date",  # get messages in creation order.
        cascade="all, delete-orphan",
    )


class Messages(Base):
    """SQL table for the messsages in the threads."""

    __tablename__ = "messages"
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    creation_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    entity: Mapped[Entity] = mapped_column(Enum(Entity), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    is_complete: Mapped[bool] = mapped_column(Boolean)

    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("threads.thread_id"), nullable=False
    )
    thread: Mapped[Threads] = relationship("Threads", back_populates="messages")
    tool_calls: Mapped[list["ToolCalls"]] = relationship(
        "ToolCalls", back_populates="message", cascade="all, delete-orphan"
    )
    tool_selection: Mapped[list["ToolSelection"]] = relationship(
        "ToolSelection", cascade="all, delete-orphan"
    )
    token_consumption: Mapped[list["TokenConsumption"]] = relationship(
        "TokenConsumption", cascade="all, delete-orphan"
    )
    search_vector: Mapped[str] = mapped_column(TSVECTOR, nullable=True)

    __table_args__ = (
        # GIN index for full-text search performance
        Index("ix_messages_search_vector", "search_vector", postgresql_using="gin"),
    )


class ToolCalls(Base):
    """SQL table used for tool call parameters."""

    __tablename__ = "tool_calls"
    tool_call_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    arguments: Mapped[str] = mapped_column(String, nullable=False)
    validated: Mapped[bool] = mapped_column(Boolean, nullable=True)

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("messages.message_id")
    )
    message: Mapped[Messages] = relationship("Messages", back_populates="tool_calls")


class ToolSelection(Base):
    """SQL table used for storing the tool selected for a query."""

    __tablename__ = "tool_selection"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    tool_name: Mapped[str] = mapped_column(String, nullable=False)
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("messages.message_id")
    )


class TokenConsumption(Base):
    """SQL table to track token consumption of the LLMs."""

    __tablename__ = "token_consumption"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("messages.message_id")
    )
    type: Mapped[TokenType] = mapped_column(Enum(TokenType), nullable=False)
    task: Mapped[Task] = mapped_column(Enum(Task), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
