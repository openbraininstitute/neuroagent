"""Schemas for the chatbot."""

import datetime
import enum
import uuid
from typing import Any

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
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime.datetime:
    """Return the utc time."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class Entity(enum.Enum):
    """Class to restrict entity column."""

    USER = "user"
    ASSISTANT = "assistant"


class PartType(enum.Enum):
    """Type of Response API part."""

    MESSAGE = "message"
    REASONING = "reasoning"
    FUNCTION_CALL = "function_call"
    FUNCTION_CALL_OUTPUT = "function_call_output"


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


class ReasoningLevels(enum.Enum):
    """Type of reasoning level."""

    NONE = "none"
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


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
    """SQL table for user messages. Each message groups all AI responses/tool calls."""

    __tablename__ = "messages"
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    creation_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    entity: Mapped[Entity] = mapped_column(Enum(Entity), nullable=False)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("threads.thread_id"), nullable=False
    )
    thread: Mapped[Threads] = relationship("Threads", back_populates="messages")
    parts: Mapped[list["Parts"]] = relationship(
        "Parts",
        back_populates="message",
        order_by="Parts.order_index",
        cascade="all, delete-orphan",
    )
    tool_selection: Mapped[list["ToolSelection"]] = relationship(
        "ToolSelection", cascade="all, delete-orphan"
    )
    model_selection: Mapped["ComplexityEstimation"] = relationship(
        "ComplexityEstimation", cascade="all, delete-orphan"
    )
    token_consumption: Mapped[list["TokenConsumption"]] = relationship(
        "TokenConsumption", cascade="all, delete-orphan"
    )


class Parts(Base):
    """SQL table for storing Response API parts (JSONB format)."""

    __tablename__ = "parts"
    part_id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("messages.message_id"), nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[PartType] = mapped_column(Enum(PartType), nullable=False)
    output: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False)
    validated: Mapped[bool] = mapped_column(Boolean, nullable=True)

    message: Mapped[Messages] = relationship("Messages", back_populates="parts")

    __table_args__ = (Index("ix_parts_message_id", "message_id"),)


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


class ComplexityEstimation(Base):
    """SQL table used for storing complexity estimation and underlying choices from a query."""

    __tablename__ = "complexity_estimation"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=lambda: uuid.uuid4()
    )
    complexity: Mapped[int] = mapped_column(Integer, nullable=True)
    model: Mapped[str] = mapped_column(String, nullable=False)
    reasoning: Mapped[ReasoningLevels] = mapped_column(
        Enum(ReasoningLevels), nullable=True
    )
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
