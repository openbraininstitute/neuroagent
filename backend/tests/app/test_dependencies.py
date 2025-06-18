"""Test dependencies."""

import uuid
from typing import AsyncIterator
from unittest.mock import Mock

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
)
from neuroagent.app.schemas import UserInfo
from neuroagent.new_types import Agent


def test_get_settings(patch_required_env):
    settings = get_settings()
    assert settings.tools.literature.url == "https://fake_url"


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
async def test_get_user(httpx_mock, monkeypatch, patch_required_env, test_user_info):
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


def test_get_connection_string_full(monkeypatch, patch_required_env):
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


def test_get_starting_agent(patch_required_env, get_weather_tool):
    settings = Settings()
    agent = get_starting_agent(settings, tool_list=[get_weather_tool])

    assert isinstance(agent, Agent)
    assert agent.tools == [get_weather_tool]


@pytest.mark.asyncio
@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
async def test_get_thread(patch_required_env, db_connection, test_user_info):
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
async def test_get_thread_invalid_thread_id(
    patch_required_env, db_connection, test_user_info
):
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
async def test_get_thread_invalid_user_id(
    patch_required_env, db_connection, test_user_info
):
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
            literature=Mock(url="http://literature"),
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
        "literature_search_url": "http://literature/",
        "bluenaas_url": "http://bluenaas/",
        "obi_one_url": "http://kenoriz.com/",
        "entitycore_url": "http://twg-mrt.com/",
        "thumbnail_generation_url": "http://thumbnail.com/",
    }
