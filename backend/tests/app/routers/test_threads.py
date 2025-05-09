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
        rate_limiter={"disabled": True},
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
        assert not threads["results"]

        create_output_1 = app_client.post(
            "/threads",
            json={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()

        # Create a thread with generated title
        create_thread_response = app_client.patch(
            f"/threads/{create_output_1['thread_id']}/generate_title",
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
        assert not threads["results"]
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

        assert len(threads["results"]) == 1
        assert threads["results"][0] == create_output_3

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab", "project_id": "test_project"},
        ).json()

        assert len(threads["results"]) == 1
        assert threads["results"][0] == create_output_1

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab2", "project_id": "test_project2"},
        ).json()

        assert len(threads["results"]) == 1
        assert threads["results"][0] == create_output_2

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": "test_vlab_wrong", "project_id": "test_project"},
        )

        assert threads.status_code == 401


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads_paginated(
    patch_required_env, httpx_mock, app_client, db_connection
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert set(threads.keys()) == {
            "next_cursor",
            "has_more",
            "page_size",
            "results",
        }

        create_output_1 = app_client.post(
            "/threads",
        ).json()
        create_output_2 = app_client.post(
            "/threads",
        ).json()
        create_output_3 = app_client.post("/threads").json()
        threads = app_client.get("/threads", params={"page_size": 2}).json()

        assert threads["page_size"] == 2
        assert threads["next_cursor"] == create_output_2["update_date"]
        assert threads["has_more"]
        assert len(threads["results"]) == 2

        assert threads["results"][0]["thread_id"] == create_output_3["thread_id"]
        assert threads["results"][1]["thread_id"] == create_output_2["thread_id"]

        page_2 = app_client.get(
            "/threads", params={"page_size": 2, "cursor": threads["next_cursor"]}
        ).json()
        assert page_2["results"][0] == create_output_1


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads_query_param(
    patch_required_env, httpx_mock, app_client, db_connection
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads["results"]
        # Create some threads
        create_output_1 = app_client.post("/threads").json()
        create_output_2 = app_client.post("/threads").json()
        create_output_3 = app_client.post("/threads").json()
        app_client.patch(
            f"/threads/{create_output_2['thread_id']}", json={"title": "New chat"}
        )

        thread_ids = [
            create_output_1["thread_id"],
            create_output_2["thread_id"],
            create_output_3["thread_id"],
        ]
        threads = app_client.get("/threads", params={"sort": "-creation_date"}).json()
        assert [thread["thread_id"] for thread in threads["results"]] == list(
            reversed(thread_ids)
        )

        threads = app_client.get("/threads", params={"sort": "creation_date"}).json()
        assert [thread["thread_id"] for thread in threads["results"]] == thread_ids

        threads = app_client.get("/threads", params={"sort": "-update_date"}).json()
        assert [thread["thread_id"] for thread in threads["results"]] == [
            thread_ids[1],
            thread_ids[2],
            thread_ids[0],
        ]

        threads = app_client.get("/threads", params={"sort": "update_date"}).json()
        assert [thread["thread_id"] for thread in threads["results"]] == [
            thread_ids[0],
            thread_ids[2],
            thread_ids[1],
        ]


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_update_thread_title(patch_required_env, httpx_mock, app_client, db_connection):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads["results"]

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
        assert not threads["results"]

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
        assert len(threads["results"]) == 1
        assert threads["results"][0]["thread_id"] == thread_id

        delete_response = app_client.delete(f"/threads/{thread_id}").json()
        assert delete_response["Acknowledged"] == "true"

        threads = app_client.get("/threads").json()
        assert not threads["results"]

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
        messages = app_client.get(
            f"/threads/{thread.thread_id}/messages", params={"sort": "creation_date"}
        ).json()["results"]

    assert messages[0]["entity"] == "user"
    assert messages[0]["msg_content"] == {"content": "This is my query."}
    assert messages[0]["message_id"]
    assert messages[0]["creation_date"]

    assert messages[1]["entity"] == "ai_tool"
    assert messages[1]["msg_content"] == {"content": ""}
    assert messages[1]["message_id"]
    assert messages[1]["creation_date"]

    assert messages[2]["entity"] == "tool"
    assert messages[2]["msg_content"] == {"content": "It's sunny today."}
    assert messages[2]["message_id"]
    assert messages[2]["creation_date"]

    assert messages[3]["entity"] == "ai_message"
    assert messages[3]["msg_content"] == {"content": "sample response content."}
    assert messages[3]["message_id"]
    assert messages[3]["creation_date"]

    assert messages[0]["creation_date"] < messages[1]["creation_date"]
    assert messages[1]["creation_date"] < messages[2]["creation_date"]
    assert messages[2]["creation_date"] < messages[3]["creation_date"]


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_thread_messages_sort_and_filter(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
):
    # Setup settings and dependency overrides as in the other test
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection},
        keycloak={"issuer": "https://great_issuer.com"},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    db_items, _ = populate_db
    thread = db_items["thread"]

    # Test sorting in ascending order (oldest first) and filtering for USER and TOOL messages.
    with app_client as app_client:
        response = app_client.get(
            f"/threads/{thread.thread_id}/messages",
            params={"sort": "-creation_date", "entity": ["USER", "TOOL"]},
        )
        messages = response.json()["results"]

    # Expecting only the messages that have the entities "user" and "tool".
    # From the populate_db fixture these are:
    # - The first message: entity "user", msg_content {"content": "This is my query."}
    # - The third message: entity "tool", msg_content {"content": "It's sunny today."}
    assert len(messages) == 2

    # Check that messages are sorted in ascending order by creation_date.
    assert messages[0]["creation_date"] >= messages[1]["creation_date"]

    # Verify the filtering: first message should be from "user" and second from "tool"
    assert messages[0]["entity"] == "tool"
    assert messages[0]["msg_content"] == {"content": "It's sunny today."}
    assert messages[1]["entity"] == "user"
    assert messages[1]["msg_content"] == {"content": "This is my query."}

    # Test sorting in descending order (newest first) and filtering for AI_TOOL and AI_MESSAGE messages.
    with app_client as app_client:
        response = app_client.get(
            f"/threads/{thread.thread_id}/messages",
            params={"sort": "creation_date", "entity": ["AI_TOOL", "AI_MESSAGE"]},
        )
        messages = response.json()["results"]

    # Expecting only the messages that have the entities "ai_tool" and "ai_message".
    # According to populate_db these are:
    # - The second message: entity "ai_tool", msg_content {"content": ""}
    # - The fourth message: entity "ai_message", msg_content {"content": "sample response content."}
    assert len(messages) == 2

    # Check that messages are sorted in descending order by creation_date.
    assert messages[0]["creation_date"] <= messages[1]["creation_date"]

    # Verify the filtering:
    # Assuming the newer message (by creation_date) is "ai_message"
    assert messages[0]["entity"] == "ai_tool"
    assert messages[0]["msg_content"] == {"content": ""}
    assert messages[1]["entity"] == "ai_message"
    assert messages[1]["msg_content"] == {"content": "sample response content."}


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_thread_messages_paginated(
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
        messages = app_client.get(
            f"/threads/{thread.thread_id}/messages", params={"page_size": 3}
        ).json()
        page_2 = app_client.get(
            f"/threads/{thread.thread_id}/messages",
            params={"page_size": 3, "cursor": messages["next_cursor"]},
        ).json()

    assert set(messages.keys()) == {"next_cursor", "has_more", "page_size", "results"}

    assert messages["page_size"] == 3
    assert messages["next_cursor"] == messages["results"][-1]["creation_date"]
    assert messages["has_more"]
    assert len(messages["results"]) == 3

    messages_results = messages["results"]

    assert messages_results[2]["entity"] == "ai_tool"
    assert messages_results[2]["msg_content"] == {"content": ""}
    assert messages_results[2]["message_id"]
    assert messages_results[2]["creation_date"]

    assert messages_results[1]["entity"] == "tool"
    assert messages_results[1]["msg_content"] == {"content": "It's sunny today."}
    assert messages_results[1]["message_id"]
    assert messages_results[1]["creation_date"]

    assert messages_results[0]["entity"] == "ai_message"
    assert messages_results[0]["msg_content"] == {"content": "sample response content."}
    assert messages_results[0]["message_id"]
    assert messages_results[0]["creation_date"]

    assert messages_results[0]["creation_date"] > messages_results[1]["creation_date"]
    assert messages_results[1]["creation_date"] > messages_results[2]["creation_date"]

    assert len(page_2["results"]) == 1


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_thread_messages_empty_paginated(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
):
    mock_keycloak_user_identification(httpx_mock)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    with app_client as app_client:
        # Create a thread
        create_output = app_client.post(
            "/threads",
        ).json()
        thread = create_output["thread_id"]
        # Get the messages of the thread
        messages = app_client.get(
            f"/threads/{thread}/messages", params={"page_size": 3}
        ).json()

    assert set(messages.keys()) == {"next_cursor", "has_more", "page_size", "results"}

    assert messages["page_size"] == 3
    assert messages["next_cursor"] is None
    assert not messages["has_more"]
    assert len(messages["results"]) == 0
