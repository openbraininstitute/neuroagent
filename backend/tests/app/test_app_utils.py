"""Test app utils."""

import json
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.exceptions import HTTPException

from neuroagent.app.app_utils import (
    format_messages_output,
    format_messages_vercel,
    rate_limit,
    setup_engine,
    validate_project,
)
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, ToolCalls
from neuroagent.app.schemas import (
    MessagesRead,
    MessagesReadVercel,
    PaginatedResponse,
    TextPartVercel,
    ToolCall,
    ToolCallPartVercel,
    ToolCallVercel,
    UserInfo,
)


@pytest.mark.asyncio
async def test_validate_project():
    vlab_id = "test_vlab"
    proj_id = "test_project"
    groups = [
        "/proj/test_vlab/test_project/admin",
        "/proj/test_vlab2/test_project2/member",
        "/vlab/test_vlab/admin",
        "/vlab/test_vlab2/member",
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
        ("test_vlab", "test_project"),
        (None, "test_project"),
        ("test_vlab", None),
        (None, None),
    ],
)
@pytest.mark.asyncio
async def test_validate_project_empty_groups(vlab_id, proj_id):
    # Groups are missing
    keycloak_response = {
        "sub": "1234greatsub-amazing",
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
def test_setup_engine(create_engine_mock, monkeypatch, patch_required_env):
    create_engine_mock.return_value = AsyncMock()

    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "prefix")

    settings = Settings()

    connection_string = "postgresql+asyncpg://user:password@localhost/dbname"
    retval = setup_engine(settings=settings, connection_string=connection_string)
    assert retval is not None


@patch("neuroagent.app.app_utils.create_async_engine")
def test_setup_engine_no_connection_string(
    create_engine_mock, monkeypatch, patch_required_env
):
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
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
        entity=Entity.AI_MESSAGE,
        is_complete=True,
        message_id="359eeb212e94409594d9ca7d4ff22640",
        content=json.dumps({"content": "DUMMY_AI_CONTENT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[],
    )
    msg2 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
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
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
        entity=Entity.AI_TOOL,
        is_complete=True,
        message_id="e21d5f16855341819d25d1d935327ffc",
        content=json.dumps({"content": "DUMMY_AI_TOOL_CONTENT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[dummy_tool_call],
    )
    msg4 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
        entity=Entity.USER,
        is_complete=True,
        message_id="87866e27dc7848c2bd684ea395d5a466",
        content=json.dumps({"content": "DUMMY_USER_TEXT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[],
    )

    fake_message_list = [msg1, msg2, msg3, msg4]

    expected_output = PaginatedResponse(
        next_cursor=datetime(2025, 6, 4, 14, 4, 41),
        has_more=False,
        page_size=10,
        results=[
            MessagesRead(
                message_id="359eeb212e94409594d9ca7d4ff22640",
                entity="ai_message",
                thread_id="e2db8c7d11704762b42bfdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41),
                msg_content={"content": "DUMMY_AI_CONTENT"},
                tool_calls=[],
            ),
            MessagesRead(
                message_id="06c305de156243aaadeabeeeb53880a2",
                entity="tool",
                thread_id="e2db8c7d11704762b42bfdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41),
                msg_content={"content": "DUMMY_RESULT"},
                tool_calls=[],
            ),
            MessagesRead(
                message_id="e21d5f16855341819d25d1d935327ffc",
                entity="ai_tool",
                thread_id="e2db8c7d11704762b42bfdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41),
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
                message_id="87866e27dc7848c2bd684ea395d5a466",
                entity="user",
                thread_id="e2db8c7d11704762b42bfdcd08526735",
                is_complete=True,
                creation_date=datetime(2025, 6, 4, 14, 4, 41),
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
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
        entity=Entity.AI_MESSAGE,
        is_complete=True,
        message_id="359eeb212e94409594d9ca7d4ff22640",
        content=json.dumps({"content": "DUMMY_AI_CONTENT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[],
    )
    msg2 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
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
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
        entity=Entity.AI_TOOL,
        is_complete=True,
        message_id="e21d5f16855341819d25d1d935327ffc",
        content=json.dumps({"content": "DUMMY_AI_TOOL_CONTENT"}),
        thread_id="e2db8c7d11704762b42bfdcd08526735",
        tool_calls=[dummy_tool_call],
    )
    msg4 = Messages(
        creation_date=datetime(2025, 6, 4, 14, 4, 41),
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
                createdAt=datetime(2025, 6, 4, 14, 4, 41),
                content="DUMMY_AI_CONTENT",
                parts=[
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
                    {
                        "message_id": "359eeb212e94409594d9ca7d4ff22640",
                        "isComplete": True,
                    },
                    {
                        "toolCallId": "1234",
                        "validated": "not_required",
                        "isComplete": True,
                    },
                ],
            ),
            MessagesReadVercel(
                id="87866e27dc7848c2bd684ea395d5a466",
                role="user",
                createdAt=datetime(2025, 6, 4, 14, 4, 41),
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
