import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest
from dateutil import parser

from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_openai_client,
    get_settings,
    get_storage_client,
)
from neuroagent.app.main import app
from neuroagent.app.schemas import ThreadGeneratedTitle
from tests.conftest import mock_keycloak_user_identification
from tests.mock_client import MockOpenAIClient, create_mock_response


def test_create_thread(httpx_mock, app_client, db_connection, test_user_info):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )

    app.dependency_overrides[get_settings] = lambda: test_settings
    _, vlab, proj = test_user_info
    with app_client as app_client:
        # Create a thread
        create_output = app_client.post(
            "/threads",
            json={"virtual_lab_id": str(vlab), "project_id": str(proj)},
        ).json()
    assert create_output["thread_id"]
    assert create_output["title"] == "New chat"
    assert create_output["vlab_id"] == str(vlab)
    assert create_output["project_id"] == str(proj)


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_generate_thread_title(httpx_mock, app_client, db_connection, test_user_info):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection},
        llm={"suggestion_model": "great_model"},
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
    _, vlab, proj = test_user_info

    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads["results"]

        create_output_1 = app_client.post(
            "/threads",
            json={"virtual_lab_id": str(vlab), "project_id": str(proj)},
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
def test_get_threads(httpx_mock, app_client, db_connection, test_user_info):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    _, vlab, proj = test_user_info

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads["results"]
        create_output_1 = app_client.post(
            "/threads",
            json={"virtual_lab_id": str(vlab), "project_id": str(proj)},
        ).json()
        create_output_2 = app_client.post(
            "/threads",
            json={
                "virtual_lab_id": str(vlab)[:-1] + "1",
                "project_id": str(proj)[:-1] + "1",
            },
        ).json()
        create_output_3 = app_client.post("/threads").json()
        threads = app_client.get("/threads").json()

        assert len(threads["results"]) == 1
        assert threads["results"][0] == create_output_3

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": str(vlab), "project_id": str(proj)},
        ).json()

        assert len(threads["results"]) == 1
        assert threads["results"][0] == create_output_1

        threads = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": str(vlab)[:-1] + "1",
                "project_id": str(proj)[:-1] + "1",
            },
        ).json()

        assert len(threads["results"]) == 1
        assert threads["results"][0] == create_output_2

        threads = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": str(vlab)[:-1] + "2",
                "project_id": str(proj)[:-1] + "2",
            },
        )

        assert threads.status_code == 401


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads_paginated(httpx_mock, app_client, db_connection, test_user_info):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
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
def test_get_threads_query_param(httpx_mock, app_client, db_connection, test_user_info):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
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
def test_get_threads_exclude_empty(
    httpx_mock,
    app_client,
    db_connection,
    test_user_info,
    populate_db,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    _, vlab, proj = test_user_info
    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads["results"]
        # Create some threads
        create_output_1 = app_client.post(
            "/threads", json={"virtual_lab_id": str(vlab), "project_id": str(proj)}
        ).json()
        create_output_2 = app_client.post(
            "/threads", json={"virtual_lab_id": str(vlab), "project_id": str(proj)}
        ).json()
        create_output_3 = app_client.post(
            "/threads", json={"virtual_lab_id": str(vlab), "project_id": str(proj)}
        ).json()

        thread_ids = [
            create_output_1["thread_id"],
            create_output_2["thread_id"],
            create_output_3["thread_id"],
        ]

        # Keep empty threads
        threads = app_client.get(
            "/threads", params={"virtual_lab_id": vlab, "project_id": proj}
        ).json()
        db_items, _ = populate_db
        assert [thread["thread_id"] for thread in threads["results"]] == list(
            reversed([str(db_items["thread"].thread_id)] + thread_ids)
        )

        # Remove empty threads
        threads = app_client.get(
            "/threads",
            params={"exclude_empty": True, "virtual_lab_id": vlab, "project_id": proj},
        ).json()
        assert threads["results"][0]["thread_id"] == str(db_items["thread"].thread_id)


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_update_thread_title(httpx_mock, app_client, db_connection, test_user_info):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    _, vlab, proj = test_user_info

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads["results"]

        # Check when wrong thread id
        wrong_response = app_client.patch(
            f"/threads/{uuid.uuid4()}", json={"title": "great_title"}
        )
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads",
            json={"virtual_lab_id": str(vlab), "project_id": str(proj)},
        ).json()
        thread_id = create_thread_response["thread_id"]

        updated_title = "Updated Thread Title"
        update_response = app_client.patch(
            f"/threads/{thread_id}", json={"title": updated_title}
        ).json()

        assert update_response["title"] == updated_title


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_delete_thread(
    httpx_mock,
    app_client,
    db_connection,
    monkeypatch,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_storage_client] = lambda: Mock()

    fake_delete_from_storage = Mock()
    monkeypatch.setattr(
        "neuroagent.app.routers.threads.delete_from_storage", fake_delete_from_storage
    )
    _, vlab, proj = test_user_info

    with app_client as app_client:
        threads = app_client.get("/threads").json()
        assert not threads["results"]

        # Check when wrong thread id
        wrong_response = app_client.delete(f"/threads/{uuid.uuid4()}")
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads",
            json={"virtual_lab_id": str(vlab), "project_id": str(proj)},
        ).json()
        thread_id = create_thread_response["thread_id"]

        threads = app_client.get(
            "/threads",
            params={"virtual_lab_id": str(vlab), "project_id": str(proj)},
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
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
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
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    test_user_info,
):
    # Setup settings and dependency overrides as in the other test
    mock_keycloak_user_identification(httpx_mock, test_user_info)
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
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
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
    httpx_mock, app_client, db_connection, test_user_info
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
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


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_thread_messages_vercel_format(
    httpx_mock,
    app_client,
    db_connection,
    populate_db,
    test_user_info,
):
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    db_items, _ = populate_db
    thread = db_items["thread"]

    with app_client as app_client:
        # Get the messages of the thread
        messages = app_client.get(
            f"/threads/{thread.thread_id}/messages",
            params={"page_size": 1, "vercel_format": True},
        ).json()
        page_2 = app_client.get(
            f"/threads/{thread.thread_id}/messages",
            params={
                "page_size": 2,
                "cursor": messages["next_cursor"],
                "vercel_format": True,
            },
        ).json()

    # Assert the first page with all its attributes.
    assert set(messages.keys()) == {"next_cursor", "has_more", "page_size", "results"}
    assert messages["page_size"] == 1
    assert messages["has_more"]
    assert len(messages["results"]) == 1

    messages_results = messages["results"]

    assert isinstance(messages_results, list)
    assert len(messages_results) == 1

    item = messages_results[0]
    assert isinstance(item, dict)
    assert item["id"]
    assert item["createdAt"]
    assert item.get("role") == "assistant"
    assert item.get("content") == "sample response content."

    parts = item.get("parts")
    assert isinstance(parts, list)
    assert len(parts) == 3

    first_part = parts[0]
    assert first_part.get("type") == "text"
    assert first_part.get("text") == ""

    second_part = parts[1]
    assert second_part.get("type") == "tool-invocation"
    tool_inv = second_part.get("toolInvocation")
    assert isinstance(tool_inv, dict)
    assert tool_inv.get("toolCallId") == "mock_id_tc"
    assert tool_inv.get("toolName") == "get_weather"
    assert tool_inv.get("args") == {"location": "Geneva"}
    assert tool_inv.get("state") == "call"
    assert tool_inv.get("results") is None

    third_part = parts[2]
    assert third_part.get("type") == "text"
    assert third_part.get("text") == "sample response content."

    annotations = item.get("annotations")
    assert isinstance(annotations, list)
    assert len(annotations) == 2

    ann1 = annotations[0]
    assert ann1.get("toolCallId") == "mock_id_tc"
    assert ann1.get("validated") == "not_required"
    assert ann1.get("isComplete") is True

    ann2 = annotations[1]
    assert ann2["messageId"]
    assert ann2.get("isComplete") is True

    # Assert the second page
    assert len(page_2["results"]) == 1
    assert page_2["has_more"] is False
    assert page_2["next_cursor"] is None
    assert page_2["page_size"] == 2

    msg = page_2["results"][0]
    assert msg["annotations"] is None
    assert msg["content"] == "This is my query."
    assert msg["parts"] is None
    assert msg["role"] == "user"


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads_creation_date_filters(
    httpx_mock,
    app_client,
    db_connection,
    test_user_info,
):
    """Test creation date filtering with various scenarios."""
    mock_keycloak_user_identification(httpx_mock, test_user_info)
    test_settings = Settings(
        db={"prefix": db_connection}, keycloak={"issuer": "https://great_issuer.com"}
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    _, vlab, proj = test_user_info
    with app_client as app_client:
        # Create 5 threads in sequence to ensure different creation dates
        thread_responses = []
        for _ in range(5):
            raw_response = app_client.post(
                "/threads", json={"virtual_lab_id": str(vlab), "project_id": str(proj)}
            )

            assert raw_response.status_code == 200

            response = raw_response.json()
            thread_responses.append(response)

        for resp in thread_responses:
            date = parser.parse(resp["creation_date"])
            assert date.utcoffset() == timezone.utc.utcoffset(
                None
            )  # Response dates should include timezone

        creation_dates = [resp["creation_date"] for resp in thread_responses]

        # Test creation_date_lte only
        middle_date = creation_dates[2]
        threads = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": vlab,
                "project_id": proj,
                "creation_date_lte": middle_date,
                "sort": "creation_date",  # Ascending order
            },
        ).json()
        assert len(threads["results"]) == 3  # Should get first 3 threads
        result_dates = [thread["creation_date"] for thread in threads["results"]]
        assert all(date <= middle_date for date in result_dates)

        # Test creation_date_gte only
        threads = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": vlab,
                "project_id": proj,
                "creation_date_gte": middle_date,
                "sort": "creation_date",  # Ascending order
            },
        ).json()
        assert len(threads["results"]) == 3  # Should get last 3 threads
        result_dates = [thread["creation_date"] for thread in threads["results"]]
        assert all(date >= middle_date for date in result_dates)

        # Test both lte and gte (date range)
        start_date = creation_dates[1]
        end_date = creation_dates[3]
        threads = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": vlab,
                "project_id": proj,
                "creation_date_gte": start_date,
                "creation_date_lte": end_date,
                "sort": "creation_date",  # Ascending order
            },
        ).json()
        assert len(threads["results"]) == 3  # Should get middle 3 threads
        result_dates = [thread["creation_date"] for thread in threads["results"]]
        assert all(start_date <= date <= end_date for date in result_dates)

        # Test with different timezone (UTC+2)
        tz_offset = timezone(timedelta(hours=2))
        middle_date_plus2 = datetime.fromisoformat(middle_date).astimezone(tz_offset)

        threads = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": vlab,
                "project_id": proj,
                "creation_date_lte": middle_date_plus2.isoformat(),  # Will include +02:00
                "sort": "creation_date",  # Ascending order
            },
        ).json()
        # Should still get 3 threads since the UTC time is the same
        assert len(threads["results"]) == 3
        result_dates = [thread["creation_date"] for thread in threads["results"]]
        assert all(date <= middle_date for date in result_dates)

        # Test invalid date format (should fail with 422)
        response = app_client.get(
            "/threads",
            params={
                "virtual_lab_id": vlab,
                "project_id": proj,
                "creation_date_lte": datetime.fromisoformat(middle_date)
                .replace(tzinfo=None)
                .isoformat(),  # No timezone info
            },
        )
        assert response.status_code == 422
        assert "timezone info" in response.json()["detail"][0]["msg"]
