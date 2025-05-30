import logging

from fastapi.testclient import TestClient

from neuroagent.app.dependencies import get_settings, get_tool_list
from neuroagent.app.main import app


def test_settings_endpoint(app_client, dont_look_at_env_file, settings):
    response = app_client.get("/settings")

    replace_secretstr = settings.model_dump()
    replace_secretstr["openai"]["token"] = "**********"
    assert response.json() == replace_secretstr


def test_readyz(app_client):
    response = app_client.get(
        "/",
    )

    body = response.json()
    assert isinstance(body, dict)
    assert body["status"] == "ok"


def test_custom_openapi(app_client, get_weather_tool):
    app.dependency_overrides[get_tool_list] = lambda mcp_tools: [get_weather_tool]
    with app_client as client:
        openapi = client.get("/openapi.json")
    openapi_json = openapi.json()
    assert "FakeToolOutput" in openapi_json["components"]["schemas"]
    assert "NestedPartialOutput" in openapi_json["components"]["schemas"]
    assert (
        openapi_json["components"]["schemas"]["FakeToolOutput"]["properties"]["output"][
            "$ref"
        ]
        == "#/components/schemas/NestedPartialOutput"
    )


def test_lifespan(caplog, monkeypatch, patch_required_env, db_connection):
    get_settings.cache_clear()
    caplog.set_level(logging.INFO)

    monkeypatch.setenv("NEUROAGENT_LOGGING__LEVEL", "info")
    monkeypatch.setenv("NEUROAGENT_LOGGING__EXTERNAL_PACKAGES", "warning")
    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", db_connection)

    # The with statement triggers the startup.
    with TestClient(app) as test_client:
        test_client.get("/healthz")

    assert caplog.record_tuples[0][::2] == (
        "neuroagent.app.dependencies",
        "Reading the environment and instantiating settings",
    )

    assert (
        logging.getLevelName(logging.getLogger("neuroagent").getEffectiveLevel())
        == "INFO"
    )
    assert (
        logging.getLevelName(logging.getLogger("httpx").getEffectiveLevel())
        == "WARNING"
    )
    assert (
        logging.getLevelName(logging.getLogger("fastapi").getEffectiveLevel())
        == "WARNING"
    )
    assert (
        logging.getLevelName(logging.getLogger("bluepyefe").getEffectiveLevel())
        == "CRITICAL"
    )
