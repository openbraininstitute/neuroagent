import json

import pytest

from neuroagent.app.config import Settings
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
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    db_items, session = populate_db
    thread = db_items["thread"]
    assistant_message = db_items["assistant_message"]
    # Get the FUNCTION_CALL part from assistant message
    await session.refresh(assistant_message, ["parts"])
    tool_call_part = assistant_message.parts[0]
    tool_id = tool_call_part.output["id"]

    app.dependency_overrides[get_tool_list] = lambda: [get_weather_tool]

    with app_client as app_client:
        response = app_client.patch(
            f"/tools/{thread.thread_id}/execute/{tool_id}",
            json={"validation": "accepted"},
        )
    assert response.json()["status"] == "done"
    # Check if validation status changed
    await session.refresh(tool_call_part)
    assert tool_call_part.validated


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
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    db_items, session = populate_db
    thread = db_items["thread"]
    assistant_message = db_items["assistant_message"]
    # Get the FUNCTION_CALL part from assistant message
    await session.refresh(assistant_message, ["parts"])
    tool_call_part = assistant_message.parts[0]
    tool_id = tool_call_part.output["id"]

    app.dependency_overrides[get_tool_list] = lambda: [get_weather_tool]

    with app_client as app_client:
        response = app_client.patch(
            f"/tools/{thread.thread_id}/execute/{tool_id}",
            json={"validation": "rejected"},
        )

    assert response.json()["status"] == "done"
    # Check if validation status changed
    await session.refresh(tool_call_part)
    assert not tool_call_part.validated


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
