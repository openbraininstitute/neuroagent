import json

import pytest

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity
from neuroagent.app.dependencies import get_settings, get_tool_list
from neuroagent.app.main import app
from tests.conftest import mock_keycloak_user_identification


@pytest.mark.asyncio
async def test_execute_tool_call_accepted(
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    get_weather_tool,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        llm={"base_url": "http://cool.com", "open_router_token": "sk-or-cool"},
        storage={"azure_account_name": "test_account", "azure_account_key": "test_key"},
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
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    get_weather_tool,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        llm={"base_url": "http://cool.com", "open_router_token": "sk-or-cool"},
        storage={"azure_account_name": "test_account", "azure_account_key": "test_key"},
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
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    get_weather_tool,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        llm={"base_url": "http://cool.com", "open_router_token": "sk-or-cool"},
        storage={"azure_account_name": "test_account", "azure_account_key": "test_key"},
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
    httpx_mock,
    app_client,
    db_connection,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        tools={"whitelisted_tool_regex": ".*"},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        response = app_client.get("/tools")

    assert response.status_code == 200
    tools = response.json()
    assert isinstance(tools, list)

    assert set(tools[0].keys()) == {"name", "name_frontend"}


@pytest.mark.asyncio
async def test_get_tool_metadata(
    httpx_mock,
    app_client,
    db_connection,
    get_weather_tool,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_tool_list] = lambda: [get_weather_tool]

    with app_client as app_client:
        response = app_client.get(f"/tools/{get_weather_tool.name}")

    assert response.status_code == 200
    tool_metadata = response.json()

    # Check all required fields are present
    expected_fields = {
        "name",
        "name_frontend",
        "description",
        "description_frontend",
        "utterances",
        "input_schema",
        "hil",
        "is_online",
    }
    assert set(tool_metadata.keys()) == expected_fields

    # Check specific values
    assert tool_metadata["name"] == get_weather_tool.name
    assert tool_metadata["name_frontend"] == get_weather_tool.name_frontend
    assert tool_metadata["description"] == get_weather_tool.description
    assert (
        tool_metadata["description_frontend"] == get_weather_tool.description_frontend
    )

    assert isinstance(tool_metadata["input_schema"], str)
    assert tool_metadata["is_online"]

    # Verify input_schema is valid JSON and has expected structure
    input_schema = json.loads(tool_metadata["input_schema"])
    assert input_schema == {
        "parameters": [
            {
                "name": "location",
                "description": "The location to get the weather for",
                "required": True,
                "default": None,
            }
        ]
    }
