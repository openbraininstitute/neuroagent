import pytest

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import get_settings
from neuroagent.app.main import app
from tests.conftest import mock_keycloak_user_identification


@pytest.mark.asyncio
async def test_get_all_agents(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        agent={"composition": "multi"},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        response = app_client.get("/agents")

    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, dict)
    assert len(agents.keys()) > 1

    assert set(list(agents.values())[0]) == {"name", "name_frontend", "description"}


@pytest.mark.asyncio
async def test_one_all_agents(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        agent={"composition": "multi"},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        response = app_client.get("/agents/triage_agent")

    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, dict)

    assert set(agents.keys()) == {"name", "name_frontend", "description", "tools"}
