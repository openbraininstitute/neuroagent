from unittest.mock import Mock

import pytest

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_openai_client,
    get_settings,
)
from neuroagent.app.main import app
from neuroagent.app.routers import qa
from neuroagent.app.schemas import (
    Question,
    QuestionsSuggestions,
)
from tests.conftest import mock_keycloak_user_identification
from tests.mock_client import MockOpenAIClient, create_mock_response


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_question_suggestions(
    app_client, httpx_mock, patch_required_env, db_connection, populate_db
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        accounting={"disabled": True},
        rate_limiter={"disabled": True},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    mock_openai_client = MockOpenAIClient()

    mock_class_response = QuestionsSuggestions(
        suggestions=[
            Question(question="Great question 1!"),
            Question(question="Great question 2!"),
            Question(question="Great question 3!"),
        ]
    )
    mock_response = create_mock_response(
        {"role": "assistant", "content": "sample response content"},
        structured_output_class=mock_class_response,
    )
    mock_openai_client.set_response(mock_response)
    app.dependency_overrides[get_openai_client] = lambda: mock_openai_client

    # First we test if no thread id is provided.
    with app_client as app_client:
        response = app_client.post(
            "/qa/question_suggestions",
            json={"click_history": [[["Amzing BR", "Super artifact"]]]},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

    assert response.status_code == 200
    assert response.json() == mock_class_response.model_dump()

    # Secondly we test the answer when there are no messages in DB (fresh thread)
    with app_client as app_client:
        create_output = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
        response = app_client.post(
            "/qa/question_suggestions",
            json={
                "click_history": [[["Amzing BR", "Super artifact"]]],
                "thread_id": create_output["thread_id"],
            },
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

    assert response.status_code == 200
    assert response.json() == mock_class_response.model_dump()

    # Finally we test with messages in the DB.
    db_items, _ = populate_db
    thread = db_items["thread"]

    with app_client as app_client:
        response = app_client.post(
            "/qa/question_suggestions",
            json={
                "click_history": [[["Amzing BR", "Super artifact"]]],
                "thread_id": thread.thread_id,
            },
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

    assert response.status_code == 200
    assert response.json() == mock_class_response.model_dump()

    # At the end we check if the calls were made with the right arguments:
    call_list = mock_openai_client.beta.chat.completions.parse.call_args_list
    assert call_list[0].kwargs["messages"][1] == {
        "role": "user",
        "content": 'USER JOURNEY: \n[[["Amzing BR", "Super artifact"]]]',
    }
    assert call_list[1].kwargs["messages"][1] == {
        "role": "user",
        "content": 'USER JOURNEY: \n[[["Amzing BR", "Super artifact"]]]',
    }
    assert call_list[2].kwargs["messages"][1] == {
        "role": "user",
        "content": 'CONVERSATION MESSAGES: \n[{"content": "This is my query."}, {"content": "sample response content."}]',
    }


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
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
        accounting={"disabled": True},
        rate_limiter={"disabled": True},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    agent_routine = Mock()
    app.dependency_overrides[get_agents_routine] = lambda: agent_routine

    expected_tokens = (
        b"Calling tool : resolve_entities_tool with arguments : {brain_region:"
        b" thalamus}\n This is an amazingly well streamed response. I can't believe how"
        b" good it is!"
    )

    with app_client as app_client:
        create_output = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
        response = app_client.post(
            f"/qa/chat_streamed/{create_output['thread_id']}",
            json={"content": "This is my query"},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )
    assert response.status_code == 200
    assert response.content == expected_tokens
