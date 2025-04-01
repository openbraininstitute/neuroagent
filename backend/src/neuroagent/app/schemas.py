"""Pydantic schemas for the database operations."""

import datetime
from typing import Any, Literal

from pydantic import BaseModel, conlist

from neuroagent.app.database.sql_schemas import Entity


class ToolCall(BaseModel):
    """Tool call."""

    tool_call_id: str
    name: str
    arguments: str
    validated: Literal["accepted", "rejected", "pending", "not_required"]


class MessageResponse(BaseModel):
    """Message response."""

    message_id: str
    entity: str
    thread_id: str
    order: int
    creation_date: datetime.datetime
    msg_content: dict[str, Any]
    tool_calls: list[ToolCall]


class ThreadsRead(BaseModel):
    """Data class to read chatbot conversations in the db."""

    thread_id: str
    user_id: str
    vlab_id: str | None
    project_id: str | None
    title: str
    creation_date: datetime.datetime
    update_date: datetime.datetime


class ThreadCreate(BaseModel):
    """Data class for the update of a thread."""

    title: str = "New chat"
    virtual_lab_id: str | None = None
    project_id: str | None = None


class ThreadGeneratBody(BaseModel):
    """Data class for input of the thread generation."""

    first_user_message: str


class ThreadGeneratedTitle(BaseModel):
    """Data class for the thread generation."""

    title: str


class ThreadUpdate(BaseModel):
    """Data class for the update of a thread."""

    title: str


class MessagesRead(BaseModel):
    """Output of the conversation listing crud."""

    message_id: str
    order: int
    creation_date: datetime.datetime
    msg_content: str
    entity: Literal[Entity.USER, Entity.AI_MESSAGE]


class ToolCallSchema(BaseModel):
    """Tool call crud's output."""

    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class ExecuteToolCallRequest(BaseModel):
    """Request body for executing a tool call."""

    validation: Literal["rejected", "accepted"]
    args: str | None = None
    feedback: str | None = None  # For refusal


class ExecuteToolCallResponse(BaseModel):
    """Response model for tool execution status."""

    status: Literal["done", "validation-error"]
    content: str | None = None


class ToolMetadata(BaseModel):
    """Data class for basic tool metadata."""

    name: str
    name_frontend: str


class ToolMetadataDetailed(ToolMetadata):
    """Data class for detailed tool metadata including online status."""

    description: str
    description_frontend: str
    input_schema: str
    hil: bool
    is_online: bool


class UserInfo(BaseModel):
    """Keycloak related info of a user."""

    sub: str
    groups: list[str]
    email_verified: bool | None = None
    name: str | None = None
    preferred_username: str | None = None
    given_name: str | None = None
    family_name: str | None = None
    email: str | None = None


class UserClickHistory(BaseModel):
    """Complete recorded history of the user."""

    click_history: list[list[list[str]]]


class Question(BaseModel):
    """One suggested question by the LLM."""

    question: str


class QuestionsSuggestions(BaseModel):
    """All suggested questions by the LLM."""

    suggestions: list[Question] = conlist(  # type: ignore
        item_type=Question, min_length=1, max_length=1
    )
