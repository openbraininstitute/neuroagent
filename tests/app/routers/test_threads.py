import pytest

from neuroagent.agent_routine import Agent, AgentsRoutine
from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_agents_routine,
    get_settings,
    get_starting_agent,
)
from neuroagent.app.main import app
from tests.mock_client import create_mock_response


def test_create_thread(patch_required_env, httpx_mock, app_client, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        # Create a thread
        create_output = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
    assert create_output["thread_id"]
    assert create_output["title"] == "New chat"
    assert create_output["vlab_id"] == "test_vlab"
    assert create_output["project_id"] == "test_project"


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads(patch_required_env, httpx_mock, app_client, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads["results"]
        create_output_1 = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        create_output_2 = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        threads = app_client.get("/threads/").json()

    assert len(threads["results"]) == 2
    # Threads are ordered in descending order of updating
    assert threads["results"][0] == create_output_2
    assert threads["results"][1] == create_output_1


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_threads_pagination(
    patch_required_env, httpx_mock, app_client, db_connection
):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        create_output_1 = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        create_output_2 = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        create_output_3 = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        threads_page_1 = app_client.get(
            "/threads/", params={"page_size": 2, "page": 1}
        ).json()
        threads_page_2 = app_client.get(
            "/threads/", params={"page_size": 2, "page": 2}
        ).json()

    assert threads_page_1["page"] == 1
    assert threads_page_1["page_size"] == 2
    assert threads_page_1["total_pages"] == 2
    assert len(threads_page_1["results"]) == 2
    assert threads_page_1["results"][0] == create_output_3
    assert threads_page_1["results"][1] == create_output_2

    assert threads_page_2["page"] == 2
    assert threads_page_2["page_size"] == 2
    assert threads_page_2["total_pages"] == 2
    assert len(threads_page_2["results"]) == 1
    assert threads_page_2["results"][0] == create_output_1


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_get_thread_metadata(patch_required_env, httpx_mock, app_client, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads["results"]
        create_output = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()

        thread = app_client.get(f"/threads/{create_output['thread_id']}").json()

    assert thread == create_output


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_messages(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    mock_openai_client,
    get_weather_tool,
):
    # Put data in the db
    routine = AgentsRoutine(client=mock_openai_client)

    mock_openai_client.set_sequential_responses(
        [
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[
                    {"name": "get_weather", "args": {"location": "Geneva"}}
                ],
            ),
            create_mock_response(
                {"role": "assistant", "content": "sample response content"}
            ),
        ]
    )
    agent = Agent(tools=[get_weather_tool])

    app.dependency_overrides[get_agents_routine] = lambda: routine
    app.dependency_overrides[get_starting_agent] = lambda: agent

    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )

    with app_client as app_client:
        # wrong thread ID
        wrong_response = app_client.get("/threads/test")
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        # Create a thread
        create_output = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        thread_id = create_output["thread_id"]
        empty_messages = app_client.get(f"/threads/{thread_id}/messages").json()
        assert empty_messages["results"] == []

        # Fill the thread
        app_client.post(
            f"/qa/chat/{thread_id}",
            json={"query": "This is my query"},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

        # Get the messages of the thread
        messages = app_client.get(f"/threads/{thread_id}/messages").json()

    assert messages["results"][0]["order"] == 0
    assert messages["results"][0]["entity"] == "user"
    assert messages["results"][0]["msg_content"] == "This is my query"
    assert messages["results"][0]["message_id"]
    assert messages["results"][0]["creation_date"]

    assert messages["results"][1]["order"] == 3
    assert messages["results"][1]["entity"] == "ai_message"
    assert messages["results"][1]["msg_content"] == "sample response content"
    assert messages["results"][1]["message_id"]
    assert messages["results"][1]["creation_date"]


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
@pytest.mark.asyncio
async def test_get_messages_pagination(
    patch_required_env,
    httpx_mock,
    app_client,
    db_connection,
    mock_openai_client,
    get_weather_tool,
):
    # Put data in the db
    routine = AgentsRoutine(client=mock_openai_client)

    mock_openai_client.set_sequential_responses(
        [
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[
                    {"name": "get_weather", "args": {"location": "Geneva"}}
                ],
            ),
            create_mock_response(
                {"role": "assistant", "content": "sample response content"}
            ),
        ]
    )
    agent = Agent(tools=[get_weather_tool])

    app.dependency_overrides[get_agents_routine] = lambda: routine
    app.dependency_overrides[get_starting_agent] = lambda: agent

    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )

    with app_client as app_client:
        # Create a thread
        create_output = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        thread_id = create_output["thread_id"]

        # Fill the thread
        app_client.post(
            f"/qa/chat/{thread_id}",
            json={"query": "This is my query"},
            headers={"x-virtual-lab-id": "test_vlab", "x-project-id": "test_project"},
        )

        # Get the messages of the thread
        messages_page_1 = app_client.get(
            f"/threads/{thread_id}/messages", params={"page_size": 1, "page": 1}
        ).json()
        messages_page_2 = app_client.get(
            f"/threads/{thread_id}/messages", params={"page_size": 1, "page": 2}
        ).json()

    assert messages_page_1["page"] == 1
    assert messages_page_1["page_size"] == 1
    assert messages_page_1["total_pages"] == 2
    assert len(messages_page_1["results"]) == 1

    assert messages_page_2["page"] == 2
    assert messages_page_2["page_size"] == 1
    assert messages_page_2["total_pages"] == 2
    assert len(messages_page_2["results"]) == 1


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_update_thread_title(patch_required_env, httpx_mock, app_client, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads["results"]

        # Check when wrong thread id
        wrong_response = app_client.patch(
            "/threads/wrong_id", json={"title": "great_title"}
        )
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        thread_id = create_thread_response["thread_id"]

        updated_title = "Updated Thread Title"
        update_response = app_client.patch(
            f"/threads/{thread_id}", json={"title": updated_title}
        ).json()

        assert update_response["title"] == updated_title


@pytest.mark.httpx_mock(can_send_already_matched_responses=True)
def test_delete_thread(patch_required_env, httpx_mock, app_client, db_connection):
    test_settings = Settings(
        db={"prefix": db_connection},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings

    httpx_mock.add_response(
        url=f"{test_settings.virtual_lab.get_project_url}/test_vlab/projects/test_project"
    )
    with app_client as app_client:
        threads = app_client.get("/threads/").json()
        assert not threads["results"]

        # Check when wrong thread id
        wrong_response = app_client.delete("/threads/wrong_id")
        assert wrong_response.status_code == 404
        assert wrong_response.json() == {"detail": {"detail": "Thread not found."}}

        create_thread_response = app_client.post(
            "/threads/?virtual_lab_id=test_vlab&project_id=test_project"
        ).json()
        thread_id = create_thread_response["thread_id"]

        threads = app_client.get("/threads/").json()
        assert len(threads["results"]) == 1
        assert threads["results"][0]["thread_id"] == thread_id

        delete_response = app_client.delete(f"/threads/{thread_id}").json()
        assert delete_response["Acknowledged"] == "true"

        threads = app_client.get("/threads/").json()
        assert not threads["results"]
