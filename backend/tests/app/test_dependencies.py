"""Test dependencies."""

import uuid
from datetime import datetime, timezone
from typing import AsyncIterator
from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from neuroagent.app.app_utils import setup_engine
from neuroagent.app.database.sql_schemas import Base, Threads
from neuroagent.app.dependencies import (
    Settings,
    get_connection_string,
    get_healthcheck_variables,
    get_httpx_client,
    get_session,
    get_starting_agent,
    get_system_prompt,
    get_thread,
    get_user_info,
)
from neuroagent.app.schemas import UserInfo
from neuroagent.new_types import Agent


@pytest.mark.asyncio
async def test_get_httpx_client():
    request = Mock()
    request.headers = {"x-request-id": "greatid"}
    httpx_client_iterator = get_httpx_client(
        request=request, token="eytwngmrtknorimawng78bbz"
    )
    assert isinstance(httpx_client_iterator, AsyncIterator)
    async for httpx_client in httpx_client_iterator:
        assert isinstance(httpx_client, AsyncClient)
        assert httpx_client.headers["x-request-id"] == "greatid"
        assert (
            httpx_client.headers["Authorization"] == "Bearer eytwngmrtknorimawng78bbz"
        )


@pytest.mark.asyncio
async def test_get_user(httpx_mock, monkeypatch, test_user_info):
    monkeypatch.setenv("NEUROAGENT_KEYCLOAK__ISSUER", "https://great_issuer.com")

    fake_response = {
        "sub": str(test_user_info[0]),
        "email_verified": False,
        "name": "Machine Learning Test User",
        "groups": [],
        "preferred_username": "sbo-ml",
        "given_name": "Machine Learning",
        "family_name": "Test User",
        "email": "email@epfl.ch",
    }
    httpx_mock.add_response(
        url="https://great_issuer.com/protocol/openid-connect/userinfo",
        json=fake_response,
    )

    settings = Settings()
    client = AsyncClient()
    user_info = await get_user_info(settings=settings, httpx_client=client)

    assert user_info == UserInfo(**fake_response)


def test_get_connection_string_full(monkeypatch):
    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "http://")
    monkeypatch.setenv("NEUROAGENT_DB__USER", "John")
    monkeypatch.setenv("NEUROAGENT_DB__PASSWORD", "Doe")
    monkeypatch.setenv("NEUROAGENT_DB__HOST", "localhost")
    monkeypatch.setenv("NEUROAGENT_DB__PORT", "5000")
    monkeypatch.setenv("NEUROAGENT_DB__NAME", "test")

    settings = Settings()
    result = get_connection_string(settings)
    assert result == "http://John:Doe@localhost:5000/test", (
        "must return fully formed connection string"
    )


@pytest.mark.asyncio
async def test_get_starting_agent(get_weather_tool):
    test_settings = Settings()
    agent = await get_starting_agent(
        tool_list_model_reasoning=(
            [get_weather_tool],
            {"model": "gpt-4o-mini", "reasoning": "none"},
        ),
        system_prompt="Test prompt",
        settings=test_settings,
    )

    assert isinstance(agent, Agent)
    assert agent.tools == [get_weather_tool]
    assert agent.model == "gpt-4o-mini"
    assert agent.reasoning == "none"


@pytest.mark.asyncio
@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
async def test_get_thread(db_connection, test_user_info):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    engine = setup_engine(test_settings, db_connection)
    session = await anext(get_session(engine))
    user_id, vlab, proj = test_user_info
    valid_thread_id = uuid.uuid4()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    new_thread = Threads(
        user_id=user_id,
        thread_id=valid_thread_id,
        vlab_id=vlab,
        project_id=proj,
        title="test_title",
    )
    session.add(new_thread)
    await session.commit()

    try:
        thread = await get_thread(
            user_info=UserInfo(
                **{
                    "sub": user_id,
                    "groups": [f"/proj/{vlab}/{proj}/admin"],
                }
            ),
            thread_id=valid_thread_id,
            session=session,
        )
        assert thread.user_id == user_id
        assert thread.thread_id == valid_thread_id
        assert thread.title == "test_title"
    finally:
        await session.close()
        await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
async def test_get_thread_invalid_thread_id(db_connection, test_user_info):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    engine = setup_engine(test_settings, db_connection)
    session = await anext(get_session(engine))
    user_id, vlab, proj = test_user_info
    valid_thread_id = uuid.uuid4()
    invalid_thread_id = uuid.uuid4()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    new_thread = Threads(
        user_id=user_id,
        thread_id=valid_thread_id,
        vlab_id=vlab,
        project_id=proj,
        title="test_title",
    )
    session.add(new_thread)
    await session.commit()

    try:
        with pytest.raises(HTTPException) as exc_info:
            await get_thread(
                user_info=UserInfo(
                    **{
                        "sub": user_id,
                        "groups": [f"/proj/{vlab}/{proj}/admin"],
                    }
                ),
                thread_id=invalid_thread_id,
                session=session,
            )
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail["detail"] == "Thread not found."
    finally:
        await session.close()
        await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
async def test_get_thread_invalid_user_id(db_connection, test_user_info):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    engine = setup_engine(test_settings, db_connection)
    session = await anext(get_session(engine))
    user_id, vlab, proj = test_user_info
    valid_thread_id = uuid.uuid4()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    new_thread = Threads(
        user_id=user_id,
        thread_id=valid_thread_id,
        vlab_id=vlab,
        project_id=proj,
        title="test_title",
    )
    session.add(new_thread)
    await session.commit()

    try:
        with pytest.raises(HTTPException) as exc_info:
            await get_thread(
                user_info=UserInfo(
                    **{
                        "sub": uuid.uuid4(),
                        "groups": [f"/proj/{vlab}/{proj}/admin"],
                    }
                ),
                thread_id=valid_thread_id,
                session=session,
            )
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail["detail"] == "Thread not found."

    finally:
        await session.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_get_healthcheck_variables():
    """Test that healthcheck variables are correctly returned with trailing slashes."""
    # Mock the minimal required settings structure
    settings = Mock(
        tools=Mock(
            bluenaas=Mock(url="http://bluenaas"),
            obi_one=Mock(url="http://kenoriz.com/"),
            entitycore=Mock(url="http://twg-mrt.com/"),
            thumbnail_generation=Mock(url="http://thumbnail.com/"),
        ),
    )
    httpx_client = Mock()

    result = get_healthcheck_variables(settings=settings, httpx_client=httpx_client)

    assert result == {
        "httpx_client": httpx_client,
        "bluenaas_url": "http://bluenaas/",
        "obi_one_url": "http://kenoriz.com/",
        "entitycore_url": "http://twg-mrt.com/",
        "thumbnail_generation_url": "http://thumbnail.com/",
    }


def test_get_system_prompt_with_mdc_files(tmp_path):
    """Test get_system_prompt function with mock .mdc files."""
    # Create mock .mdc files in tmp_path
    rule1_content = """---
description: Basic guidelines for neuroscience AI assistant
---

# Rule 1: Basic Guidelines

This is the first rule file with some basic guidelines.
It should be included in the system prompt.

## Subsection
- Point 1
- Point 2"""

    rule2_content = """---
description: Advanced guidelines for tool usage
---

# Rule 2: Advanced Guidelines

This rule has YAML frontmatter that should be removed.
Only the content after the frontmatter should be included.

## Features
- Feature A
- Feature B"""

    # Write the mock files
    rule1_file = tmp_path / "rule1.mdc"
    rule2_file = tmp_path / "rule2.mdc"

    rule1_file.write_text(rule1_content, encoding="utf-8")
    rule2_file.write_text(rule2_content, encoding="utf-8")

    # Mock datetime to have a predictable timestamp
    fixed_time = datetime(2024, 1, 15, 12, 30, 45, tzinfo=timezone.utc)

    with patch("neuroagent.app.dependencies.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_time

        # Call the function with our mock rules directory
        result = get_system_prompt(rules_dir=tmp_path)

    # Expected result
    expected_base = """# NEUROSCIENCE AI ASSISTANT

You are a neuroscience AI assistant for the Open Brain Platform.

"""
    expected_end = f"""
# CURRENT CONTEXT

Current time: {fixed_time.isoformat()}"""

    expected_rule1 = """# Rule 1: Basic Guidelines

This is the first rule file with some basic guidelines.
It should be included in the system prompt.

## Subsection
- Point 1
- Point 2"""

    expected_rule2 = """# Rule 2: Advanced Guidelines

This rule has YAML frontmatter that should be removed.
Only the content after the frontmatter should be included.

## Features
- Feature A
- Feature B"""

    expected_result = (
        f"{expected_base}\n{expected_rule1}\n\n\n{expected_rule2}\n\n{expected_end}"
    )

    assert result == expected_result


def test_get_system_prompt_no_rules_directory(tmp_path):
    """Test get_system_prompt function when rules directory doesn't exist."""
    # Use a non-existent directory
    non_existent_dir = tmp_path / "non_existent"

    # Mock datetime to have a predictable timestamp
    fixed_time = datetime(2024, 1, 15, 12, 30, 45, tzinfo=timezone.utc)

    with patch("neuroagent.app.dependencies.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_time

        # Call the function with non-existent directory
        result = get_system_prompt(rules_dir=non_existent_dir)

    # Should return only the base prompt
    expected_result = f"""# NEUROSCIENCE AI ASSISTANT

You are a neuroscience AI assistant for the Open Brain Platform.


# CURRENT CONTEXT

Current time: {fixed_time.isoformat()}"""

    assert result == expected_result


def test_get_system_prompt_empty_mdc_files(tmp_path):
    """Test get_system_prompt function with empty .mdc files."""
    # Create empty .mdc files
    empty_file1 = tmp_path / "empty1.mdc"
    empty_file2 = tmp_path / "empty2.mdc"

    empty_file1.write_text("", encoding="utf-8")
    empty_file2.write_text("   \n  \n  ", encoding="utf-8")  # Only whitespace

    # Mock datetime to have a predictable timestamp
    fixed_time = datetime(2024, 1, 15, 12, 30, 45, tzinfo=timezone.utc)

    with patch("neuroagent.app.dependencies.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_time

        # Call the function with empty files
        result = get_system_prompt(rules_dir=tmp_path)

    # Should return only the base prompt (empty files are ignored)
    expected_result = f"""# NEUROSCIENCE AI ASSISTANT

You are a neuroscience AI assistant for the Open Brain Platform.


# CURRENT CONTEXT

Current time: {fixed_time.isoformat()}"""

    assert result == expected_result
