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
                "content": "You are a smart assistant that analyzes user behavior and chatbot conversation to suggest 3 helpful and engaging next questions the user might want to ask. We provide a description of the platform, the open brain platform allows an atlas driven exploration of the mouse brain with different artifacts related to experimental and model data and more specifically neuron morphology (neuron structure including axons, soma and dendrite), electrophysiological recording (ie the electrical behavior of the neuron), ion channel, neuron density, bouton density, synapses, connections, electrical models also referred to as e-models, me-models which is the model of neuron with a specific morphology and electrical type, and the synaptome dictating how neurons are connected together. The platform also allows user to explore and build digital brain models at different scales ranging from molecular level to single neuron and larger circuits and brain regions. Users can also customize the models or create their own ones and change the cellular composition, and then run simulation experiments and perform analysis. The user is navigating on the website, and we record the last elements he accessed on the website. Here is what the user's history will look like :user_history = [[['brain_region', 'example'], ['artifact', 'example'], ['artifact', 'example'], ['artifact', 'example']], [['brain_region', 'example'], ['artifact', 'example']]]'brain_region' can be any region of the mouse brain.'artifact' can be :  'Morphology','Electrophysiology','Neuron density','Bouton density','Synapse per connection','E-model','ME-model','Synaptome' and 'data_type' can be 'Experimental data' or 'Model Data'The last element of the list represents the last click of the user, so it should naturally be more relevant.From the user history and previous messages, try to infer the user's intent on the platform. The messages have a lot more importance than the user journey.From it generate some questions the user might want to ask to a chatbot that is able to search for papers in the literature.The questions should only be about the literature. Each question should be short and concise. In total there should three questions.",
            },
            {
                "role": "user",
                "content": 'Here is the users journey : \n[[["Amzing BR", "Super artifact"]]]\n And here are the last user messages in chronological order (last message is the newest one) : \n[{"role": "user", "content": "This is my query."}, {"role": "assistant", "content": "sample response content."}]',
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
