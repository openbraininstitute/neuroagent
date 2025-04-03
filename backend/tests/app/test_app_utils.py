"""Test app utils."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.exceptions import HTTPException

from neuroagent.app.app_utils import rate_limit, setup_engine, validate_project
from neuroagent.app.config import Settings


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
