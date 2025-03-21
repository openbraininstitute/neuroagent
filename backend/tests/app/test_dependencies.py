"""Test dependencies."""

from typing import AsyncIterator
from unittest.mock import AsyncMock, Mock

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
    get_settings,
    get_starting_agent,
    get_thread,
    get_user_info,
    rate_limit,
)
from neuroagent.app.schemas import UserInfo
from neuroagent.new_types import Agent


def test_get_settings(patch_required_env):
    settings = get_settings()
    assert settings.tools.literature.url == "https://fake_url"
    assert settings.knowledge_graph.url == "https://fake_url/api/nexus/v1/search/query/"


@pytest.mark.asyncio
async def test_get_httpx_client():
    request = Mock()
    request.headers = {"x-request-id": "greatid"}
    httpx_client_iterator = get_httpx_client(request=request)
    assert isinstance(httpx_client_iterator, AsyncIterator)
    async for httpx_client in httpx_client_iterator:
        assert isinstance(httpx_client, AsyncClient)
        assert httpx_client.headers["x-request-id"] == "greatid"


@pytest.mark.asyncio
async def test_get_user(httpx_mock, monkeypatch, patch_required_env):
    monkeypatch.setenv("NEUROAGENT_KEYCLOAK__ISSUER", "https://great_issuer.com")

    fake_response = {
        "sub": "12345",
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
    token = "eyJgreattoken"
    user_info = await get_user_info(token=token, settings=settings, httpx_client=client)

    assert user_info == UserInfo(**fake_response)


def test_get_connection_string_full(monkeypatch, patch_required_env):
    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "http://")
    monkeypatch.setenv("NEUROAGENT_DB__USER", "John")
    monkeypatch.setenv("NEUROAGENT_DB__PASSWORD", "Doe")
    monkeypatch.setenv("NEUROAGENT_DB__HOST", "localhost")
    monkeypatch.setenv("NEUROAGENT_DB__PORT", "5000")
    monkeypatch.setenv("NEUROAGENT_DB__NAME", "test")

    settings = Settings()
    result = get_connection_string(settings)
    assert (
        result == "http://John:Doe@localhost:5000/test"
    ), "must return fully formed connection string"


def test_get_starting_agent(patch_required_env, get_weather_tool):
    settings = Settings()
    agent = get_starting_agent(settings, tool_list=[get_weather_tool])

    assert isinstance(agent, Agent)
    assert agent.tools == [get_weather_tool]


@pytest.mark.asyncio
@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
async def test_get_thread(patch_required_env, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    engine = setup_engine(test_settings, db_connection)
    session = await anext(get_session(engine))
    user_id = "test_user"
    valid_thread_id = "test_thread_id"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    new_thread = Threads(
        user_id=user_id,
        thread_id=valid_thread_id,
        vlab_id="test_vlab_DB",
        project_id="project_id_DB",
        title="test_title",
    )
    session.add(new_thread)
    await session.commit()

    try:
        thread = await get_thread(
            user_info=UserInfo(
                **{
                    "sub": user_id,
                    "groups": ["/proj/test_vlab_DB/project_id_DB/admin"],
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
async def test_get_thread_invalid_thread_id(patch_required_env, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    engine = setup_engine(test_settings, db_connection)
    session = await anext(get_session(engine))
    user_id = "test_user"
    valid_thread_id = "test_thread_id"
    invalid_thread_id = "wrong_thread_id"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    new_thread = Threads(
        user_id=user_id,
        thread_id=valid_thread_id,
        vlab_id="test_vlab_DB",
        project_id="project_id_DB",
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
                        "groups": ["/proj/test_vlab_DB/project_id_DB/admin"],
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
async def test_get_thread_invalid_user_id(patch_required_env, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    engine = setup_engine(test_settings, db_connection)
    session = await anext(get_session(engine))
    user_id = "test_user"
    valid_thread_id = "test_thread_id"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    new_thread = Threads(
        user_id=user_id,
        thread_id=valid_thread_id,
        vlab_id="test_vlab_DB",
        project_id="project_id_DB",
        title="test_title",
    )
    session.add(new_thread)
    await session.commit()

    try:
        with pytest.raises(HTTPException) as exc_info:
            await get_thread(
                user_info=UserInfo(
                    **{
                        "sub": "wrong_user",
                        "groups": ["/proj/test_vlab_DB/project_id_DB/admin"],
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
            literature=Mock(url="http://literature"),
            bluenaas=Mock(url="http://bluenaas"),
        ),
        knowledge_graph=Mock(
            base_url="http://kg",
        ),
    )
    httpx_client = Mock()

    result = get_healthcheck_variables(settings=settings, httpx_client=httpx_client)

    assert result == {
        "httpx_client": httpx_client,
        "literature_search_url": "http://literature/",
        "knowledge_graph_url": "http://kg/",
        "bluenaas_url": "http://bluenaas/",
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "route_path,limit,expiry",
    [
        ("/qa/chat_streamed/{thread_id}", 10, 86400),
        ("/qa/question_suggestions", 100, 86400),
    ],
)
async def test_rate_limit_active(route_path, limit, expiry):
    """Test basic rate limiting flow for different endpoints."""
    # Mock request
    request = Mock()
    request.scope = {"route": Mock(path=route_path)}

    settings = Mock(
        rate_limiter=Mock(
            disabled=False,
            limit_chat=10,
            expiry_chat=86400,
            limit_suggestions=100,
            expiry_suggestions=86400,
            redis_host="localhost",
            redis_port=6379,
        )
    )

    user_info = Mock(
        sub="1234567890",
        email="test@example.com",
        email_verified=False,
        family_name="Doe",
        given_name="John",
        groups=["/proj/aaaaa/bbbb/admin", "/vlab/aaaaa/admin"],
        name="John Doe",
        preferred_username="whatever",
    )

    thread = Mock(vlab_id=None, project_id=None)

    # Use AsyncMock for Redis client
    redis_mock = AsyncMock()
    redis_mock.get.return_value = None
    redis_mock.set.return_value = True
    redis_mock.incr.return_value = 1
    redis_mock.pttl.return_value = 1000
    request.app = Mock()
    request.app.state.redis_client = redis_mock

    await rate_limit(request, settings, user_info, thread)

    expected_key = f"rate_limit:{user_info.sub}:{route_path}"
    redis_mock.get.assert_called_once_with(expected_key)
    redis_mock.set.assert_called_once_with(expected_key, 1, ex=expiry)


@pytest.mark.asyncio
async def test_rate_limit_not_active_disabled():
    """Test rate limiting is skipped when disabled in settings."""
    request = Mock()
    request.scope = {"route": Mock(path="/qa/chat_streamed/{thread_id}")}

    settings = Mock(
        rate_limiter=Mock(
            disabled=True,  # Rate limiting disabled
            limit_chat=10,
            expiry_chat=86400,
            limit_suggestions=100,
            expiry_suggestions=86400,
            redis_host="localhost",
            redis_port=6379,
        )
    )

    user_info = Mock(sub="1234567890")
    thread = Mock()

    # Redis mock should not be called
    redis_mock = AsyncMock()
    request.app = Mock()
    request.app.state.redis_client = redis_mock

    await rate_limit(request, settings, user_info, thread)

    # Verify no Redis operations were performed
    redis_mock.get.assert_not_called()
    redis_mock.set.assert_not_called()
    redis_mock.incr.assert_not_called()


@pytest.mark.asyncio
async def test_rate_limit_not_active_no_redis():
    """Test rate limiting is skipped when Redis client is not available."""
    request = Mock()
    request.scope = {"route": Mock(path="/qa/chat_streamed/{thread_id}")}

    settings = Mock(
        rate_limiter=Mock(
            disabled=False,
            limit_chat=10,
            expiry_chat=86400,
            limit_suggestions=100,
            expiry_suggestions=86400,
            redis_host="localhost",
            redis_port=6379,
        )
    )

    user_info = Mock(sub="1234567890")
    thread = Mock()

    # Set Redis client to None
    request.app = Mock()
    request.app.state.redis_client = None

    # Should complete without error
    await rate_limit(request, settings, user_info, thread)


@pytest.mark.asyncio
async def test_rate_limit_not_active_vlab_project_present():
    """Test rate limiting is skipped when thread has vlab_id and project_id."""
    request = Mock()
    request.scope = {"route": Mock(path="/qa/chat_streamed/{thread_id}")}

    settings = Mock(
        rate_limiter=Mock(
            disabled=False,
            limit_chat=10,
            expiry_chat=86400,
            limit_suggestions=100,
            expiry_suggestions=86400,
            redis_host="localhost",
            redis_port=6379,
        )
    )

    user_info = Mock(sub="1234567890")
    # Create thread with both vlab_id and project_id
    thread = Mock(vlab_id="test_vlab", project_id="test_project")

    # Redis mock should not be called
    redis_mock = AsyncMock()
    request.app = Mock()
    request.app.state.redis_client = redis_mock

    await rate_limit(request, settings, user_info, thread)

    # Verify no Redis operations were performed
    redis_mock.get.assert_not_called()
    redis_mock.set.assert_not_called()
    redis_mock.incr.assert_not_called()
