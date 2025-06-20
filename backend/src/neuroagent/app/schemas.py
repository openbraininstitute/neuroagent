"""Pydantic schemas for the database operations."""

import datetime
from typing import Any, Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, conlist


class ToolCallVercel(BaseModel):
    """Tool call in Vercel format."""

    toolCallId: str
    toolName: str
    args: dict[str, Any]
    state: Literal["partial-call", "call", "result"]
    result: str | None = None

    model_config = ConfigDict(extra="ignore")


class ToolCallPartVercel(BaseModel):
    """Tool call part from Vercel."""

    type: Literal["tool-invocation"] = "tool-invocation"
    toolInvocation: ToolCallVercel


class TextPartVercel(BaseModel):
    """Text part of Vercel."""

    type: Literal["text"] = "text"
    text: str


class ToolCall(BaseModel):
    """Tool call."""

    tool_call_id: str
    name: str
    arguments: str
    validated: Literal["accepted", "rejected", "pending", "not_required"]


class BaseRead(BaseModel):
    """Base class for read schemas."""


T = TypeVar("T", bound=BaseRead)


class MessagesReadVercel(BaseRead):
    """Message response in Vercel format."""

    id: UUID
    role: str
    createdAt: datetime.datetime
    content: str
    parts: list[ToolCallPartVercel | TextPartVercel] | None = None
    annotations: list[dict[str, Any]] | None = None


class MessagesRead(BaseRead):
    """Message response."""

    message_id: UUID
    entity: str
    thread_id: UUID
    is_complete: bool
    creation_date: datetime.datetime
    msg_content: dict[str, Any]
    tool_calls: list[ToolCall]


class ThreadsRead(BaseRead):
    """Data class to read chatbot conversations in the db."""

    thread_id: UUID
    user_id: UUID
    vlab_id: UUID | None
    project_id: UUID | None
    title: str
    creation_date: datetime.datetime
    update_date: datetime.datetime


class ThreadCreate(BaseModel):
    """Data class for the update of a thread."""

    title: str = "New chat"
    virtual_lab_id: UUID | None = None
    project_id: UUID | None = None


class ThreadGeneratBody(BaseModel):
    """Data class for input of the thread generation."""

    first_user_message: str


class ThreadGeneratedTitle(BaseModel):
    """Data class for the thread generation."""

    title: str


class ThreadUpdate(BaseModel):
    """Data class for the update of a thread."""

    title: str


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

    sub: UUID
    groups: list[str] = Field(default_factory=list)
    email_verified: bool | None = None
    name: str | None = None
    preferred_username: str | None = None
    given_name: str | None = None
    family_name: str | None = None
    email: str | None = None


class Question(BaseModel):
    """One suggested question by the LLM."""

    question: str


class PaginatedParams(BaseModel):
    """Input query parameters for paginated endpoints."""

    cursor: str | None = Field(default=None)
    page_size: int = Field(default=10, ge=1)


class PaginatedResponse(BaseModel, Generic[T]):
    """Base class for paginated responses."""

    next_cursor: datetime.datetime | None
    has_more: bool
    page_size: int
    results: list[T]


class QuestionsSuggestions(BaseModel):
    """All suggested questions by the LLM when there are already messages."""

    suggestions: list[Question] = conlist(  # type: ignore
        item_type=Question, min_length=3, max_length=3
    )


class UserJourney(BaseModel):
    """Schema of the user's journey."""

    timestamp: datetime.datetime
    region: str
    artifact: str | None = None


class QuestionsSuggestionsRequest(BaseModel):
    """Request for the suggestion endpoint."""

    click_history: list[UserJourney] | None = None
    thread_id: str | None = None
