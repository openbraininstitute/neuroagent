from unittest.mock import Mock

import pytest

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_openai_client,
    get_s3_client,
    get_settings,
)
from neuroagent.app.main import app
from neuroagent.app.schemas import ThreadGeneratedTitle
from tests.conftest import mock_keycloak_user_identification
from tests.mock_client import MockOpenAIClient, create_mock_response


def test_create_thread(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )

    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        # Create a thread
        create_output = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
    assert create_output["thread_id"]
    assert create_output["title"] == "New chat"
    assert create_output["vlab_id"] == "test_vlab"
    assert create_output["project_id"] == "test_project"


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_generate_thread_title(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection},
        openai={"model": "great_model"},
        keycloak={"issuer": "https://great_issuer.com"},
    )

    mock_openai_client = MockOpenAIClient()
    mock_class_response = ThreadGeneratedTitle(title="Great Title")
    mock_response = create_mock_response(
        {"role": "assistant", "content": "sample response content"},
        structured_output_class=mock_class_response,
    )
    mock_openai_client.set_response(mock_response)

    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_openai_client] = lambda: mock_openai_client

    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads

        create_output_1 = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()

        # Create a thread with generated title
        create_thread_response = app_client.patch(
            f'/threads/{create_output_1["thread_id"]}/generate_title',
            json={"first_user_message": "This is my query"},
        ).json()

        assert create_thread_response["title"] == "Great Title"
        mock_openai_client.assert_create_called_with_structure_output(
            **{
                "messages": [
                    {
                        "role": "system",
                        "content": "Given the user's first message of a conversation, generate a short title for this conversation (max 5 words).",
                    },
                    {"role": "user", "content": "This is my query"},
                ],
                "model": "great_model",
                "response_format": ThreadGeneratedTitle,
            }
        )


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads
        create_output_1 = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
        create_output_2 = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab2", "project_id": "test_project2"},
        ).json()
        create_output_3 = app_client.post("/threads").json()
        threads = app_client.get("/threads").json()

        assert len(threads) == 1
        assert threads[0] == create_output_3

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()

        assert len(threads) == 1
        assert threads[0] == create_output_1

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab2", "project_id": "test_project2"},
        ).json()

        assert len(threads) == 1
        assert threads[0] == create_output_2

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab_wrong", "project_id": "test_project"},
        )

        assert threads.status_code == 401


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_update_thread_title(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads

        # Check when wrong thread id
        wrong_response = app_client.patch(
            "/threads/wrong_id", json={"title": "great_title"}
        )
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
        thread_id = create_thread_response["thread_id"]

        updated_title = "Updated Thread Title"
        update_response = app_client.patch(
            f"/threads/{thread_id}", json={"title": updated_title}
        ).json()

        assert update_response["title"] == updated_title


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_delete_thread(
    patch_required_env, httpx_mock, app_client, db_connection, monkeypatch
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_s3_client] = lambda: Mock()

    fake_delete_from_storage = Mock()
    monkeypatch.setattr(
        "neuroagent.app.routers.threads.delete_from_storage", fake_delete_from_storage
    )

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads

        # Check when wrong thread id
        wrong_response = app_client.delete("/threads/wrong_id")
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
        thread_id = create_thread_response["thread_id"]

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()
        assert len(threads) == 1
        assert threads[0]["thread_id"] == thread_id

        delete_response = app_client.delete(f"/threads/{thread_id}").json()
        assert delete_response["Acknowledged"] == "true"

        threads = app_client.get("/threads").json()
        assert not threads

        assert fake_delete_from_storage.call_count == 1


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_thread_messages(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    db_items, _ = populate_db
    thread = db_items["thread"]

    with app_client as app_client:
        # Get the messages of the thread
        messages = app_client.get(f"/threads/{thread.thread_id}/messages").json()

    assert messages[0]["order"] == 0
    assert messages[0]["entity"] == "user"
    assert messages[0]["msg_content"] == {"content": "This is my query."}
    assert messages[0]["message_id"]
    assert messages[0]["creation_date"]

    assert messages[1]["order"] == 1
    assert messages[1]["entity"] == "ai_tool"
    assert messages[1]["msg_content"] == {"content": ""}
    assert messages[1]["message_id"]
    assert messages[1]["creation_date"]

    assert messages[2]["order"] == 2
    assert messages[2]["entity"] == "tool"
    assert messages[2]["msg_content"] == {"content": "It's sunny today."}
    assert messages[2]["message_id"]
    assert messages[2]["creation_date"]

    assert messages[3]["order"] == 3
    assert messages[3]["entity"] == "ai_message"
    assert messages[3]["msg_content"] == {"content": "sample response content."}
    assert messages[3]["message_id"]
    assert messages[3]["creation_date"]
