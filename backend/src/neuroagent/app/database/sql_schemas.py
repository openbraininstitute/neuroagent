"""Schemas for the chatbot."""

import datetime
import enum
import uuid

from sqlalchemy import UUID, Boolean, DateTime, Enum, ForeignKey, String
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
    creation_date: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)
    update_date: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

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
    creation_date: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)
    entity: Mapped[Entity] = mapped_column(Enum(Entity), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    is_complete: Mapped[bool] = mapped_column(Boolean)
    model: Mapped[str] = mapped_column(String, nullable=True, default=None)

    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("threads.thread_id"), nullable=False
    )
    thread: Mapped[Threads] = relationship("Threads", back_populates="messages")
    tool_calls: Mapped[list["ToolCalls"]] = relationship(
        "ToolCalls", back_populates="message", cascade="all, delete-orphan"
    )
    selected_tools: Mapped[list["ToolSelection"]] = relationship(
        "ToolSelection", cascade="all, delete-orphan"
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
    selected_tools: Mapped[str] = mapped_column(String, nullable=False)
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("messages.message_id")
    )
