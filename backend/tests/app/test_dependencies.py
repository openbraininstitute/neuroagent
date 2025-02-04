"""Test dependencies."""

from typing import AsyncIterator
from unittest.mock import Mock

import pytest
from httpx import AsyncClient

from neuroagent.app.dependencies import (
    Settings,
    get_connection_string,
    get_httpx_client,
    get_settings,
    get_starting_agent,
    get_user_id,
)
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
    user_id = await get_user_id(token=token, settings=settings, httpx_client=client)

    assert user_id == fake_response["sub"]


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


def test_get_starting_agent(patch_required_env):
    settings = Settings()
    agent = get_starting_agent(settings)

    assert isinstance(agent, Agent)
