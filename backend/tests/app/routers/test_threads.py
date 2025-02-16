import pytest

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_openai_client,
    get_settings,
)
from neuroagent.app.main import app
from tests.conftest import mock_keycloak_user_identification
from tests.mock_client import create_mock_response


def test_create_thread(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )

    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        # Create a thread
        create_output = app_client.post(
            "/threads?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
    assert create_output["thread_id"]
    assert create_output["title"] == "New chat"
    assert create_output["vlab_id"] == "test_vlab"
    assert create_output["project_id"] == "test_project"


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_generate_thread_title(
    patch_required_env, httpx_mock, app_client, db_connection, mock_openai_client
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection},
        openai={"model": "great_model"},
        keycloak={"issuer": "https://great_issuer.com"},
    )
    mock_openai_client.set_response(
        create_mock_response(
            {"role": "assistant", "content": "sample response content"}
        ),
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_openai_client] = lambda: mock_openai_client

    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads

        # Create a thread with generated title
        create_thread_response = app_client.post(
            "/threads/generated_title?virtual_lab_id=test_vlab&project_id=test_project",
            json={"first_user_message": "This is my query"},
        ).json()

        assert create_thread_response["title"] == "sample response content"
        mock_openai_client.assert_create_called_with(
            **{
                "messages": [
                    {
                        "role": "system",
                        "content": "Given the user's first message of a conversation, generate a short title for this conversation (max 5 words).",
                    },
                    {"role": "user", "content": "This is my query"},
                ],
                "model": "great_model",
            }
        )


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab2/projects/test_project2"
    )
    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads
        create_output_1 = app_client.post(
            "/threads?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        create_output_2 = app_client.post(
            "/threads?virtual_lab_id=test_vlab2&project_id=test_project2"
        ).json()
        threads = app_client.get("/threads").json()

    assert len(threads) == 2
    assert threads[0] == create_output_1
    assert threads[1] == create_output_2

    threads = app_client.get(
        "/threads", params={"virtual_lab_id": "test_vlab", "project_id": "test_project"}
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
    ).json()

    assert len(threads) == 0


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_update_thread_title(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
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
            "/threads?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        thread_id = create_thread_response["thread_id"]

        updated_title = "Updated Thread Title"
        update_response = app_client.patch(
            f"/threads/{thread_id}", json={"title": updated_title}
        ).json()

        assert update_response["title"] == updated_title


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_delete_thread(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads

        # Check when wrong thread id
        wrong_response = app_client.delete("/threads/wrong_id")
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        thread_id = create_thread_response["thread_id"]

        threads = app_client.get("/threads").json()
        assert len(threads) == 1
        assert threads[0]["thread_id"] == thread_id

        delete_response = app_client.delete(f"/threads/{thread_id}").json()
        assert delete_response["Acknowledged"] == "true"

        threads = app_client.get("/threads").json()
        assert not threads


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
