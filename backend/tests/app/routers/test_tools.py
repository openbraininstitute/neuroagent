import json

import pytest

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity
from neuroagent.app.dependencies import get_settings, get_tool_list
from neuroagent.app.main import app
from tests.conftest import mock_keycloak_user_identification


@pytest.mark.asyncio
async def test_execute_tool_call_accepted(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    get_weather_tool,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    db_items, session = populate_db
    thread, _, tool_call = db_items.values()
    app.dependency_overrides[get_tool_list] = lambda: [get_weather_tool]

    with app_client as app_client:
        response = app_client.patch(
            f"/tools/{thread.thread_id}/execute/{tool_call.tool_call_id}",
            json={"validation": "accepted"},
        )
    assert response.json()["status"] == "done"
    # Check if validation status changed and new tool message appeared
    await session.refresh(tool_call)
    assert tool_call.validated
    messages = await thread.awaitable_attrs.messages
    assert messages[-1].entity == Entity.TOOL


@pytest.mark.asyncio
async def test_execute_tool_call_rejected(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    get_weather_tool,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    db_items, session = populate_db
    thread, _, tool_call = db_items.values()

    app.dependency_overrides[get_tool_list] = lambda: [get_weather_tool]

    with app_client as app_client:
        response = app_client.patch(
            f"/tools/{thread.thread_id}/execute/{tool_call.tool_call_id}",
            json={"validation": "rejected"},
        )

    assert response.json()["status"] == "done"
    # Check if validation status changed and new tool message appeared
    await session.refresh(tool_call)
    assert not tool_call.validated
    messages = await thread.awaitable_attrs.messages
    assert messages[-1].entity == Entity.TOOL


@pytest.mark.asyncio
async def test_execute_tool_call_validation_error(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    get_weather_tool,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    db_items, session = populate_db
    thread, _, tool_call = db_items.values()

    app.dependency_overrides[get_tool_list] = lambda: [get_weather_tool]

    with app_client as app_client:
        response = app_client.patch(
            f"/tools/{thread.thread_id}/execute/{tool_call.tool_call_id}",
            json={
                "validation": "accepted",
                "args": json.dumps({"lction": "Zurich"}),
            },  # Make a mistake in the args json
        )

    # Check if validation status didn't change
    assert response.json()["status"] == "validation-error"
    await session.refresh(tool_call)
    assert tool_call.validated is None


@pytest.mark.asyncio
async def test_get_available_tools(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    get_weather_tool,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        response = app_client.get("/tools")

    assert response.status_code == 200
    tools = response.json()
    assert isinstance(tools, list)
    assert len(tools) == 12

    assert set(tools[0].keys()) == {"name", "name_frontend"}
