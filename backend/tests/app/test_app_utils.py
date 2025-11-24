"""Test app utils."""

import json
from datetime import datetime, timezone
from typing import Literal
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi.exceptions import HTTPException
from pydantic import BaseModel, Field

from neuroagent.app.app_utils import (
    filter_tools_and_model_by_conversation,
    format_messages_output,
    format_messages_vercel,
    parse_redis_data,
    rate_limit,
    setup_engine,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, ToolCalls
from neuroagent.app.schemas import (
    AnnotationMessageVercel,
    AnnotationToolCallVercel,
    MessagesRead,
    MessagesReadVercel,
    PaginatedResponse,
    RateLimitInfo,
    TextPartVercel,
    ToolCall,
    ToolCallPartVercel,
    ToolCallVercel,
    UserInfo,
)
from tests.mock_client import MockOpenAIClient, create_mock_response


@pytest.mark.asyncio
async def test_validate_project(test_user_info):
    _, vlab_id, proj_id = test_user_info
    groups = [
        f"/proj/{vlab_id}/{proj_id}/admin",
        f"/proj/{str(vlab_id)[:-1] + '1'}/{str(proj_id)[:-1] + '1'}/member",
        f"/vlab/{vlab_id}/admin",
        f"/vlab/{str(vlab_id)[:-1] + '1'}/member",
    ]
    # Don't specify anything
    validate_project(groups=groups)

    # Specify correct vlab + proj
    validate_project(virtual_lab_id=vlab_id, project_id=proj_id, groups=groups)

    # Specify only the correct vlab
    validate_project(virtual_lab_id=vlab_id, groups=groups)

    # Specify only the project
    with pytest.raises(HTTPException):
        validate_project(project_id=proj_id, groups=groups)

    # Specify wrong vlab correct proj
    with pytest.raises(HTTPException):
        validate_project(virtual_lab_id="wrong_vlab", project_id=proj_id, groups=groups)

    # Specify correct vlab wrong project
    with pytest.raises(HTTPException):
        validate_project(
            virtual_lab_id=vlab_id, project_id="wrong_project", groups=groups
        )

    # Specify wrong vlab wrong project
    with pytest.raises(HTTPException):
        validate_project(
            virtual_lab_id="wrong_vlab", project_id="wrong_project", groups=groups
        )


@pytest.mark.parametrize(
    "vlab_id,proj_id",
    [
        (
            UUID("12315678-5123-4567-4053-890126456789"),
            UUID("47939269-9123-4567-2934-918273640192"),
        ),
        (None, UUID("47939269-9123-4567-2934-918273640192")),
        (UUID("12315678-5123-4567-4053-890126456789"), None),
        (None, None),
    ],
)
@pytest.mark.asyncio
async def test_validate_project_empty_groups(vlab_id, proj_id):
    # Groups are missing
    keycloak_response = {
        "sub": "12345678-9123-4567-1234-890123456789",
        "email_verified": True,
        "name": "John Doe",
        "preferred_username": "WonderJoe",
        "given_name": "John",
        "family_name": "Doe",
        "email": "test.email@great.com",
    }

    user_info = UserInfo(**keycloak_response)
    groups = user_info.groups

    # Don't specify anything
    validate_project(groups=groups)

    # Specify vlab + proj but they are not in groups
    if vlab_id or proj_id:
        with pytest.raises(HTTPException):
            validate_project(virtual_lab_id=vlab_id, project_id=proj_id, groups=groups)
    else:
        validate_project(virtual_lab_id=vlab_id, project_id=proj_id, groups=groups)


@patch("neuroagent.app.app_utils.create_async_engine")
def test_setup_engine(create_engine_mock, monkeypatch):
    create_engine_mock.return_value = AsyncMock()

    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "prefix")

    settings = Settings()

    connection_string = "postgresql+asyncpg://user:password@localhost/dbname"
    retval = setup_engine(settings=settings, connection_string=connection_string)
    assert retval is not None


@patch("neuroagent.app.app_utils.create_async_engine")
def test_setup_engine_no_connection_string(create_engine_mock, monkeypatch):
    create_engine_mock.return_value = AsyncMock()

    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "prefix")

    settings = Settings()

    retval = setup_engine(settings=settings, connection_string=None)
    assert retval is None


@pytest.mark.asyncio
async def test_rate_limit_first_request():
    """Test basic rate limiting flow on first request."""
    redis_mock = AsyncMock()
    redis_mock.get.return_value = None
    redis_mock.set.return_value = True

    limit_headers, rate_limited = await rate_limit(
        redis_client=redis_mock,
        route_path="/test/path",
        limit=10,
        expiry=3600,
        user_sub="test_user",
    )

    expected_key = "rate_limit:test_user:/test/path"
    redis_mock.get.assert_called_once_with(expected_key)
    redis_mock.set.assert_called_once_with(expected_key, 1, ex=3600)
    assert not rate_limited
    assert limit_headers.model_dump(by_alias=True) == {
        "x-ratelimit-limit": "10",
        "x-ratelimit-remaining": "9",
        "x-ratelimit-reset": "3600",
    }


@pytest.mark.asyncio
async def test_rate_limit_subsequent_request_below_limit():
    """Test rate limiting when subsequent request is below the limit."""
    redis_mock = AsyncMock()
    redis_mock.get.return_value = "5"  # Simulate existing requests
    redis_mock.incr.return_value = 6  # New count after increment
    redis_mock.pttl.return_value = 3599183  # New pttl

    limit_headers, rate_limited = await rate_limit(
        redis_client=redis_mock,
        route_path="/test/path",
        limit=10,
        expiry=3600,
        user_sub="test_user",
    )

    expected_key = "rate_limit:test_user:/test/path"
    redis_mock.get.assert_called_once_with(expected_key)
    redis_mock.incr.assert_called_once_with(expected_key)
    redis_mock.set.assert_not_called()  # Should not set new value for subsequent requests
    assert not rate_limited
    assert limit_headers.model_dump(by_alias=True) == {
        "x-ratelimit-limit": "10",
        "x-ratelimit-remaining": "4",
        "x-ratelimit-reset": "3599",
    }


@pytest.mark.asyncio
async def test_rate_limit_subsequent_request_at_limit():
    """Test rate limiting when subsequent request exceeds the limit."""
    redis_mock = AsyncMock()
    redis_mock.get.return_value = "10"  # Current count at limit
    redis_mock.pttl.return_value = 1000  # 1 second remaining

    limit_headers, rate_limited = await rate_limit(
        redis_client=redis_mock,
        route_path="/test/path",
        limit=10,
        expiry=3600,
        user_sub="test_user",
    )

    expected_key = "rate_limit:test_user:/test/path"
    redis_mock.get.assert_called_once_with(expected_key)
    redis_mock.pttl.assert_called_once_with(expected_key)
    redis_mock.incr.assert_not_called()  # Should not increment when over limit
    redis_mock.set.assert_not_called()  # Should not set new value
    assert rate_limited
    assert limit_headers.model_dump(by_alias=True) == {
        "x-ratelimit-limit": "10",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1",
    }


@pytest.mark.asyncio
async def test_rate_limit_no_redis():
    """Test rate limiting is skipped when Redis client is None."""
    # Should complete without error and without any calls
    await rate_limit(
        redis_client=None,
        route_path="/test/path",
        limit=10,
        expiry=3600,
        user_sub="test_user",
    )


def test_format_messages_output():
    """Test the output format conversion."""

    msg1 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.AI_MESSAGE,
        is_complete=True,
        message_id="359eeb21-2e94-4095-94d9-ca7d4ff22640",
        content=json.dumps({"content": "DUMMY_AI_CONTENT"}),
        thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
        tool_calls=[],
    )
    msg2 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.TOOL,
        is_complete=True,
        message_id="06c305de-1562-43aa-adea-beeeb53880a2",
        content=json.dumps({"content": "DUMMY_RESULT"}),
        thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
        tool_calls=[],
    )
    dummy_tool_call = ToolCalls(
        tool_call_id="1234",
        arguments="{}",
        name="dummy_tool",
        validated="not_required",
    )
    msg3 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.AI_TOOL,
        is_complete=True,
        message_id="e21d5f16-8553-4181-9d25-d1d935327ffc",
        content=json.dumps({"content": "DUMMY_AI_TOOL_CONTENT"}),
        thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
        tool_calls=[dummy_tool_call],
    )
    msg4 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.USER,
        is_complete=True,
        message_id="87866e27-dc78-48c2-bd68-4ea395d5a466",
        content=json.dumps({"content": "DUMMY_USER_TEXT"}),
        thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
        tool_calls=[],
    )

    fake_message_list = [msg1, msg2, msg3, msg4]

    expected_output = PaginatedResponse(
        next_cursor=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        has_more=False,
        page_size=10,
        results=[
            MessagesRead(
                message_id="359eeb21-2e94-4095-94d9-ca7d4ff22640",
                entity="ai_message",
                thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
                msg_content={"content": "DUMMY_AI_CONTENT"},
                tool_calls=[],
            ),
            MessagesRead(
                message_id="06c305de-1562-43aa-adea-beeeb53880a2",
                entity="tool",
                thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
                msg_content={"content": "DUMMY_RESULT"},
                tool_calls=[],
            ),
            MessagesRead(
                message_id="e21d5f16-8553-4181-9d25-d1d935327ffc",
                entity="ai_tool",
                thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
                msg_content={"content": "DUMMY_AI_TOOL_CONTENT"},
                tool_calls=[
                    ToolCall(
                        tool_call_id="1234",
                        name="dummy_tool",
                        arguments="{}",
                        validated="not_required",
                    )
                ],
            ),
            MessagesRead(
                message_id="87866e27-dc78-48c2-bd68-4ea395d5a466",
                entity="user",
                thread_id="e2db8c7d-1170-4762-b42b-fdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
                msg_content={"content": "DUMMY_USER_TEXT"},
                tool_calls=[],
            ),
        ],
    )

    fake_formated_response = format_messages_output(
        fake_message_list, {"dummy_tool": False}, False, 10
    )

    assert fake_formated_response == expected_output


def test_format_messages_vercel():
    """Test the output format conversion to vercel."""

    msg1 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.AI_MESSAGE,
        is_complete=True,
        message_id="359eeb212e94409594d9ca7d4ff22640",
        content=json.dumps({"content": "DUMMY_AI_CONTENT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[],
    )
    msg2 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.TOOL,
        is_complete=True,
        message_id="06c305de156243aaadeabeeeb53880a2",
        content=json.dumps({"content": "DUMMY_RESULT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[],
    )
    dummy_tool_call = ToolCalls(
        tool_call_id="1234",
        arguments="{}",
        name="dummy_tool",
        validated="not_required",
    )
    msg3 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.AI_TOOL,
        is_complete=True,
        message_id="e21d5f16855341819d25d1d935327ffc",
        content=json.dumps({"content": "DUMMY_AI_TOOL_CONTENT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[dummy_tool_call],
    )
    msg4 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
        entity=Entity.USER,
        is_complete=True,
        message_id="87866e27dc7848c2bd684ea395d5a466",
        content=json.dumps({"content": "DUMMY_USER_TEXT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[],
    )

    fake_message_list = [msg1, msg2, msg3, msg4]

    expected_output = PaginatedResponse(
        next_cursor=None,
        has_more=False,
        page_size=10,
        results=[
            MessagesReadVercel(
                id="359eeb212e94409594d9ca7d4ff22640",
                role="assistant",
                createdAt=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
                content="DUMMY_AI_CONTENT",
                parts=[
                    TextPartVercel(type="text", text="DUMMY_AI_TOOL_CONTENT"),
                    ToolCallPartVercel(
                        type="tool-invocation",
                        toolInvocation=ToolCallVercel(
                            toolCallId="1234",
                            toolName="dummy_tool",
                            args={},
                            state="call",
                            results=None,
                        ),
                    ),
                    TextPartVercel(type="text", text="DUMMY_AI_CONTENT"),
                ],
                annotations=[
                    AnnotationToolCallVercel(
                        toolCallId="1234", validated="not_required", isComplete=True
                    ),
                    AnnotationMessageVercel(
                        messageId="359eeb212e94409594d9ca7d4ff22640", isComplete=True
                    ),
                ],
            ),
            MessagesReadVercel(
                id="87866e27dc7848c2bd684ea395d5a466",
                role="user",
                createdAt=datetime(2025, 6, 4, 14, 4, 41, tzinfo=timezone.utc),
                content="DUMMY_USER_TEXT",
                parts=None,
                annotations=None,
            ),
        ],
    )

    fake_formated_response_vercel = format_messages_vercel(
        fake_message_list, {"dummy_tool": False}, False, 10
    )

    assert fake_formated_response_vercel == expected_output


@pytest.fixture()
def sample_redis_info():
    return {
        "rate_limit:3d202d5f-af32-48c8-bf0e-4080f53079d8:/qa/chat_streamed/{thread_id}": [
            "3",
            85501414,
        ],
        "rate_limit:3d202d5f-af32-48c8-bf0e-4080f53079d8:/qa/question_suggestions": [
            None,
            85513870,
        ],
        "rate_limit:3d202d5f-af32-48c8-bf0e-4080f53079d8:/threads/{thread_id}/generate_title": [
            None,
            -2,
        ],
    }


def test_field_matches_existing_key(sample_redis_info):
    """Test when field is a substring of an existing redis key."""
    sample_redis_info = {
        "rate_limit:3d202d5f-af32-48c8-bf0e-4080f53079d8:/qa/chat_streamed/{thread_id}": [
            "3",
            85501414,
        ],
        "rate_limit:3d202d5f-af32-48c8-bf0e-4080f53079d8:/qa/question_suggestions": [
            None,
            85513870,
        ],
        "rate_limit:3d202d5f-af32-48c8-bf0e-4080f53079d8:/threads/{thread_id}/generate_title": [
            None,
            -2,
        ],
    }
    result = parse_redis_data("chat_streamed", sample_redis_info, 10)

    expected = RateLimitInfo(limit=10, remaining=7, reset_in=85501)
    assert result == expected


def test_field_matches_key_with_none_count(sample_redis_info):
    """Test when field matches key but count is None."""
    result = parse_redis_data("question_suggestions", sample_redis_info, 5)

    expected = RateLimitInfo(limit=5, remaining=5, reset_in=85514)
    assert result == expected


def test_field_matches_key_with_negative_timestamp(sample_redis_info):
    """Test when field matches key but timestamp is negative."""
    result = parse_redis_data("generate_title", sample_redis_info, 3)

    expected = RateLimitInfo(limit=3, remaining=3, reset_in=None)
    assert result == expected


def test_field_not_found_in_keys(sample_redis_info):
    """Test when field is not a substring of any redis key."""
    result = parse_redis_data("nonexistent_endpoint", sample_redis_info, 8)

    expected = RateLimitInfo(limit=8, remaining=8, reset_in=None)
    assert result == expected


def test_empty_redis_info():
    """Test with empty redis_info dictionary."""
    result = parse_redis_data("any_field", {}, 5)

    expected = RateLimitInfo(limit=5, remaining=5, reset_in=None)
    assert result == expected


def test_usage_exceeds_limit():
    """Test when usage count exceeds the limit (remaining should be 0)."""
    redis_info = {"rate_limit:test_key": ["15", 123456789]}
    result = parse_redis_data("test_key", redis_info, 10)

    expected = RateLimitInfo(limit=10, remaining=0, reset_in=123457)
    assert result == expected


def test_usage_equals_limit():
    """Test when usage count equals the limit."""
    redis_info = {"rate_limit:test_key": ["10", 123456789]}
    result = parse_redis_data("test_key", redis_info, 10)

    expected = RateLimitInfo(limit=10, remaining=0, reset_in=123457)
    assert result == expected


def test_millisecond_to_second_conversion(sample_redis_info):
    """Test that millisecond timestamps are correctly converted to seconds."""
    redis_info = {
        "rate_limit:test_key": ["1", 1500]  # 1.5 seconds in milliseconds
    }
    result = parse_redis_data("test_key", redis_info, 5)

    expected = RateLimitInfo(limit=5, remaining=4, reset_in=2)  # rounded to 2
    assert result == expected


def test_partial_key_matching(sample_redis_info):
    """Test that partial key matching works correctly."""
    redis_info = {"rate_limit:user123:/api/v1/chat": ["4", 75000]}

    # Test various partial matches
    result1 = parse_redis_data("chat", redis_info, 10)
    result2 = parse_redis_data("api", redis_info, 10)
    result3 = parse_redis_data("user123", redis_info, 10)

    expected = RateLimitInfo(limit=10, remaining=6, reset_in=75)
    assert result1 == expected
    assert result2 == expected
    assert result3 == expected


@pytest.mark.parametrize("limit_value", [0, 1, 100, 1000])
def test_various_limit_values(sample_redis_info, limit_value):
    """Test function with various limit values."""
    redis_info = {"rate_limit:test_key": ["5", 123456]}
    result = parse_redis_data("test_key", redis_info, limit_value)

    expected_remaining = max(0, limit_value - 5)
    expected = RateLimitInfo(
        limit=limit_value, remaining=expected_remaining, reset_in=123
    )
    assert result == expected


@pytest.mark.asyncio
async def test_filter_tools_empty_tool_list():
    """Test that empty tool list returns empty list"""
    settings = Settings()
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"role": "user", "content": "Hello"}),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        )
    ]
    result, model_dict = await filter_tools_and_model_by_conversation(
        messages=messages,
        tool_list=[],
        openai_client=AsyncMock(),
        settings=settings,
    )
    assert result == []
    assert "model" in model_dict


@pytest.mark.asyncio
async def test_filter_tools_successful_selection(get_weather_tool, agent_handoff_tool):
    """Test successful tool filtering"""
    # Mock OpenAI response
    mock_openai_client = MockOpenAIClient()

    class ToolFiltering(BaseModel):
        """Data class for tool selection by an LLM."""

        selected_tools: list[Literal["agent_handoff_tool", "get_weather"]] = Field(
            min_length=1,
            description="List of selected tool names, minimum 1 items. Must contain all of the tools relevant to the conversation.",
        )
        complexity: int = Field(
            ge=0,
            le=10,
            description="Complexity of the query on a scale from 0 to 10.",
        )

    mock_openai_client.set_response(
        create_mock_response(
            {"role": "assistant", "content": ""},
            structured_output_class=ToolFiltering(
                selected_tools=["agent_handoff_tool"], complexity=5
            ),
        )
    )
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"role": "user", "content": "Hello"}),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        ),
        Messages(
            entity=Entity.AI_MESSAGE,
            content=json.dumps({"role": "assistant", "content": "Hi there!"}),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        ),
        Messages(
            entity=Entity.USER,
            content=json.dumps(
                {"role": "user", "content": "I need help with Agent handoff"}
            ),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        ),
    ]

    settings = Settings(tools={"min_tool_selection": 1})
    with patch(
        "neuroagent.app.app_utils.get_token_count",
        lambda *args, **kargs: {
            "input_cached": None,
            "input_noncached": None,
            "completion": None,
        },
    ):
        tools, model_dict = await filter_tools_and_model_by_conversation(
            messages=messages,
            tool_list=[get_weather_tool, agent_handoff_tool],
            openai_client=mock_openai_client,
            settings=settings,
        )

    assert len(tools) == 1
    assert tools[0].name == "agent_handoff_tool"
    assert model_dict["model"] == "openai/gpt-5-mini"
    assert model_dict["reasoning"] == "low"


@pytest.mark.asyncio
async def test_filter_tools_with_selected_model(get_weather_tool, agent_handoff_tool):
    """Test tool filtering when model is pre-selected"""
    mock_openai_client = MockOpenAIClient()

    class ToolFiltering(BaseModel):
        selected_tools: list[Literal["agent_handoff_tool", "get_weather"]] = Field(
            min_length=1,
            description="List of selected tool names.",
        )

    mock_openai_client.set_response(
        create_mock_response(
            {"role": "assistant", "content": ""},
            structured_output_class=ToolFiltering(selected_tools=["get_weather"]),
        )
    )
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"role": "user", "content": "What's the weather?"}),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        )
    ]

    settings = Settings(tools={"min_tool_selection": 1})
    with patch(
        "neuroagent.app.app_utils.get_token_count",
        lambda *args, **kargs: {
            "input_cached": None,
            "input_noncached": None,
            "completion": None,
        },
    ):
        result, model_dict = await filter_tools_and_model_by_conversation(
            messages=messages,
            tool_list=[get_weather_tool, agent_handoff_tool],
            openai_client=mock_openai_client,
            settings=settings,
            selected_model="openai/gpt-4",
        )

    assert len(result) == 1
    assert result[0].name == "get_weather"
    assert model_dict["model"] == "openai/gpt-4"
    assert model_dict["reasoning"] is None


@pytest.mark.asyncio
async def test_filter_tools_no_selection_needed(get_weather_tool):
    """Test when neither tool nor model selection is needed"""
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"role": "user", "content": "Hello"}),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        )
    ]

    settings = Settings(tools={"min_tool_selection": 5})
    result, model_dict = await filter_tools_and_model_by_conversation(
        messages=messages,
        tool_list=[get_weather_tool],
        openai_client=AsyncMock(),
        settings=settings,
        selected_model="openai/gpt-4",
    )

    assert len(result) == 1
    assert result[0].name == "get_weather"
    assert model_dict["model"] == "openai/gpt-4"
    assert model_dict["reasoning"] is None


@pytest.mark.asyncio
async def test_filter_tools_only_model_selection(get_weather_tool):
    """Test when only model selection is needed"""
    mock_openai_client = MockOpenAIClient()

    class ComplexityFiltering(BaseModel):
        complexity: int = Field(
            ge=0,
            le=10,
            description="Complexity of the query.",
        )

    mock_openai_client.set_response(
        create_mock_response(
            {"role": "assistant", "content": ""},
            structured_output_class=ComplexityFiltering(complexity=7),
        )
    )
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"role": "user", "content": "Complex query"}),
            thread_id=UUID("12345678-9123-4567-1234-890123456789"),
            is_complete=True,
        )
    ]

    settings = Settings()
    with patch(
        "neuroagent.app.app_utils.get_token_count",
        lambda *args, **kargs: {
            "input_cached": None,
            "input_noncached": None,
            "completion": None,
        },
    ):
        result, model_dict = await filter_tools_and_model_by_conversation(
            messages=messages,
            tool_list=[get_weather_tool],
            openai_client=mock_openai_client,
            settings=settings,
        )

    assert len(result) == 1
    assert result[0].name == "get_weather"
    assert model_dict["model"] == "openai/gpt-5-mini"
    assert model_dict["reasoning"] == "medium"
