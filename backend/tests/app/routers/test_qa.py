from unittest.mock import Mock

import pytest

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_settings,
)
from neuroagent.app.main import app
from neuroagent.app.routers import qa
from tests.conftest import mock_keycloak_user_identification


async def streamed_response():
    response = [
        "Calling ",
        "tool ",
        ": ",
        "resolve_entities_tool ",
        "with ",
        "arguments ",
        ": ",
        "{",
        "brain_region",
        ": ",
        "thalamus",
        "}",
        "\n ",
        "This",
        " is",
        " an",
        " amazingly",
        " well",
        " streamed",
        " response",
        ".",
        " I",
        " can",
        "'t",
        " believe",
        " how",
        " good",
        " it",
        " is",
        "!",
    ]
    for word in response:
        yield word


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_chat_streamed(app_client, httpx_mock, patch_required_env, db_connection):
    """Test the generative QA endpoint with a fake LLM."""
    qa.stream_agent_response = Mock()
    qa.stream_agent_response.return_value = streamed_response()
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    agent_routine = Mock()
    app.dependency_overrides[get_agents_routine] = lambda: agent_routine

    expected_tokens = (
        b"Calling tool : resolve_entities_tool with arguments : {brain_region:"
        b" thalamus}\n This is an amazingly well streamed response. I can't believe how"
        b" good it is!"
    )
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        create_output = app_client.post(
            "/threads?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        response = app_client.post(
            f"/qa/chat_streamed/{create_output['thread_id']}",
            json={"content": "This is my query"},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )
    assert response.status_code == 200
    assert response.content == expected_tokens
