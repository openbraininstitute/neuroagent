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
    QuestionsSuggestionsInChat,
)
from tests.conftest import mock_keycloak_user_identification
from tests.mock_client import MockOpenAIClient, create_mock_response


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_question_suggestions(
    app_client, httpx_mock, patch_required_env, db_connection
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
        suggestions=[Question(question="Great question!")]
    )
    mock_response = create_mock_response(
        {"role": "assistant", "content": "sample response content"},
        structured_output_class=mock_class_response,
    )
    mock_openai_client.set_response(mock_response)
    app.dependency_overrides[get_openai_client] = lambda: mock_openai_client

    with app_client as app_client:
        response = app_client.post(
            "/qa/question_suggestions",
            json={"click_history": [[["Amzing BR", "Super artifact"]]]},
            params={"vlab_id": "test_vlab", "project_id": "test_project"},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

    assert response.status_code == 200
    assert response.json() == mock_class_response.model_dump()


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_question_suggestions_in_chat(
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
    mock_class_response = QuestionsSuggestionsInChat(
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

    db_items, _ = populate_db
    thread = db_items["thread"]

    with app_client as app_client:
        response = app_client.post(
            "/qa/question_suggestions_in_chat",
            json={"click_history": [[["Amzing BR", "Super artifact"]]]},
            params={"thread_id": thread.thread_id},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

    assert response.status_code == 200
    assert response.json() == mock_class_response.model_dump()

    mock_openai_client.beta.chat.completions.parse.assert_called_with(
        messages=[
            {
                "role": "system",
                "content": "You are a smart assistant that analyzes user behavior and conversation history to suggest three concise, engaging questions the user might next ask—specifically about finding relevant literature.\n\n            Platform Context:\n            The Open Brain Platform provides an atlas-driven exploration of the mouse brain, with access to:\n            - Neuron morphology (axon, soma, dendrite structures)\n            - Electrophysiology (electrical recordings of neuronal activity)\n            - Ion channels\n            - Neuron density\n            - Bouton density\n            - Synapse-per-connection counts\n            - Electrical models (“E-models”)\n            - Morpho-electrical models (“ME-models”)\n            - Synaptome (network of neuronal connections)\n\n            Users can:\n            1. Explore and build digital brain models at scales from molecular to whole-region circuits\n            2. Customize or create new cellular-composition models\n            3. Run simulations and perform data analyses\n            4. Access both Experimental and Model data\n\n            User History Format:\n            - user_history is a list of navigation sessions.\n            - Each session is a sequence of clicks:\n            * ['brain_region', <region_name>]\n            * ['artifact', <artifact_type>]\n            * ['data_type', <\"Experimental data\" | \"Model Data\">]\n            - Artifacts include:\n            * Morphology\n            * Electrophysiology\n            * Neuron density\n            * Bouton density\n            * Synapse per connection\n            * E-model\n            * ME-model\n            * Synaptome\n            - The last element in each session is the user’s most recent click and thus the most relevant.\n\n            Task:\n            Given the user’s navigation history and recent messages, generate three short, literature-focused questions they might ask next. Prioritize their latest interactions, but weigh the content of their messages more heavily than their click history. Each question should be:\n            - Directly related to searching for scientific papers\n            - Clear and concise\n            - Focused on literature retrieval only",
            },
            {
                "role": "user",
                "content": 'USER JOURNEY : \n[[["Amzing BR", "Super artifact"]]]\n USER MESSAGES : \n[{"content": "This is my query."}, {"content": "sample response content."}]',
            },
        ],
        model="gpt-4o-mini",
        response_format=QuestionsSuggestionsInChat,
    )


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
