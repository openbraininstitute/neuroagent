from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, Mock

import pytest

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import get_redis_client, get_settings
from neuroagent.app.main import app
from tests.conftest import mock_keycloak_user_identification


@pytest.mark.asyncio
async def test_get_rate_limit_redis_disabled(app_client, httpx_mock, test_user_info):
    """Test rate limit endpoint when Redis is disabled (None)."""
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        keycloak={"issuer": "https://great_issuer.com"},
        accounting={"disabled": True},
        rate_limiter={"disabled": False},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_redis_client] = lambda: None
    # Call the endpoint with redis_client=None
    with app_client as app_client:
        response = app_client.get("/rate_limit")

    assert response.status_code == 200
    result = response.json()

    # Verify Redis disabled response
    assert result["chat_streamed"]["limit"] == -1
    assert result["chat_streamed"]["remaining"] == -1
    assert result["chat_streamed"]["reset_in"] == -1

    assert result["question_suggestions"]["limit"] == -1
    assert result["question_suggestions"]["remaining"] == -1
    assert result["question_suggestions"]["reset_in"] == -1

    assert result["generate_title"]["limit"] == -1
    assert result["generate_title"]["remaining"] == -1
    assert result["generate_title"]["reset_in"] == -1


@pytest.mark.asyncio
async def test_get_rate_limit_outside_project(app_client, httpx_mock, test_user_info):
    """Test rate limit endpoint for requests outside a project."""
    # Mock dependencies
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        keycloak={"issuer": "https://great_issuer.com"},
        accounting={"disabled": True},
        rate_limiter={"disabled": False},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    # Create a proper mock for the pipeline
    pipeline = AsyncMock()
    pipeline.get = AsyncMock()
    pipeline.pttl = AsyncMock()
    pipeline.execute = AsyncMock(return_value=[5, 3600000, 3, 1800000, 2, 900000])

    @asynccontextmanager
    async def fake_pipeline():
        yield pipeline

    redis_mock = Mock()
    # Mock Redis responses for keys
    redis_mock.keys = AsyncMock(
        return_value=[
            "rate_limit:20293-2467-9665-4678-203948573627:/qa/chat_streamed/{thread_id}",
            "rate_limit:20293-2467-9665-4678-203948573627:/qa/question_suggestions",
            "rate_limit:20293-2467-9665-4678-203948573627:/threads/{thread_id}/generate_title",
        ]
    )
    redis_mock.pipeline.return_value = fake_pipeline()

    app.dependency_overrides[get_redis_client] = lambda: redis_mock

    with app_client as app_client:
        response = app_client.get("/rate_limit")

    assert response.status_code == 200
    results = response.json()

    # Verify pipeline was used correctly
    assert redis_mock.pipeline.called
    assert pipeline.get.call_count == 3
    assert pipeline.pttl.call_count == 3
    assert pipeline.execute.called

    # Verify response structure and calculations
    assert results["chat_streamed"]["limit"] == 20
    assert results["chat_streamed"]["remaining"] == 15
    assert results["chat_streamed"]["reset_in"] == 3600

    assert results["question_suggestions"]["limit"] == 100
    assert results["question_suggestions"]["remaining"] == 97
    assert results["question_suggestions"]["reset_in"] == 1800

    assert results["generate_title"]["limit"] == 10
    assert results["generate_title"]["remaining"] == 8
    assert results["generate_title"]["reset_in"] == 900


@pytest.mark.asyncio
async def test_get_rate_limit_inside_project(app_client, httpx_mock, test_user_info):
    """Test rate limit endpoint for requests inside a project."""
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        keycloak={"issuer": "https://great_issuer.com"},
        accounting={"disabled": True},
        rate_limiter={
            "disabled": False,
            "limit_suggestions_inside": 200,
            "limit_suggestions_outside": 100,
            "limit_chat": 50,
            "limit_title": 20,
        },
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    pipeline = AsyncMock()
    pipeline.get = AsyncMock()
    pipeline.pttl = AsyncMock()
    pipeline.execute = AsyncMock(return_value=[None, -2, None, -2, None, -2])

    @asynccontextmanager
    async def fake_pipeline():
        yield pipeline

    redis_mock = Mock()
    # Mock Redis responses - no current usage
    redis_mock.keys = AsyncMock(
        return_value=[
            "rate_limit:20293-2467-9665-4678-203948573627:/qa/chat_streamed/{thread_id}",
            "rate_limit:20293-2467-9665-4678-203948573627:/qa/question_suggestions",
            "rate_limit:20293-2467-9665-4678-203948573627:/threads/{thread_id}/generate_title",
        ]
    )
    redis_mock.pipeline.return_value = fake_pipeline()
    app.dependency_overrides[get_redis_client] = lambda: redis_mock

    with app_client as app_client:
        response = app_client.get(
            "/rate_limit",
            params={
                "vlab_id": "12315678-5123-4567-4053-890126456789",
                "project_id": "47939269-9123-4567-2934-918273640192",
            },
        )

    assert response.status_code == 200
    result = response.json()

    # Verify inside project limits are used
    assert result["chat_streamed"]["limit"] == 50
    assert result["chat_streamed"]["remaining"] == 50
    assert result["chat_streamed"]["reset_in"] is None

    assert result["question_suggestions"]["limit"] == 200
    assert result["question_suggestions"]["remaining"] == 200
    assert result["question_suggestions"]["reset_in"] is None

    assert result["generate_title"]["limit"] == 20
    assert result["generate_title"]["remaining"] == 20
    assert result["generate_title"]["reset_in"] is None


@pytest.mark.asyncio
async def test_get_rate_limit_with_ttl_values(app_client, httpx_mock, test_user_info):
    """Test rate limit endpoint with various TTL scenarios."""
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        keycloak={"issuer": "https://great_issuer.com"},
        accounting={"disabled": True},
        rate_limiter={
            "disabled": False,
            "limit_suggestions_outside": 100,
            "limit_chat": 50,
            "limit_title": 20,
        },
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    pipeline = AsyncMock()
    pipeline.get = AsyncMock()
    pipeline.pttl = AsyncMock()
    pipeline.execute = AsyncMock(return_value=[1, 5432, 2, 2789, 3, 360000])

    @asynccontextmanager
    async def fake_pipeline():
        yield pipeline

    redis_mock = Mock()
    # Mock Redis responses with different TTL scenarios
    redis_mock.keys = AsyncMock(
        return_value=[
            "rate_limit:20293-2467-9665-4678-203948573627:/qa/chat_streamed/{thread_id}",
            "rate_limit:20293-2467-9665-4678-203948573627:/qa/question_suggestions",
            "rate_limit:20293-2467-9665-4678-203948573627:/threads/{thread_id}/generate_title",
        ]
    )
    redis_mock.pipeline.return_value = fake_pipeline()
    app.dependency_overrides[get_redis_client] = lambda: redis_mock

    with app_client as app_client:
        response = app_client.get("/rate_limit")

    assert response.status_code == 200
    result = response.json()

    assert result["chat_streamed"]["reset_in"] == 5
    assert result["question_suggestions"]["reset_in"] == 3
    assert result["generate_title"]["reset_in"] == 360
