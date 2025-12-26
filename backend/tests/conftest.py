"""Test configuration."""

import json
import os
from typing import ClassVar
from unittest.mock import mock_open, patch
from uuid import UUID

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Threads,
    ToolCalls,
)
from neuroagent.app.dependencies import (
    Agent,
    get_openrouter_models,
    get_settings,
)
from neuroagent.app.main import app
from neuroagent.app.schemas import OpenRouterModelResponse
from neuroagent.tasks.config import Settings as SettingsTasks
from neuroagent.tools.base_tool import BaseTool
from tests.mock_client import MockOpenAIClient, create_mock_response


@pytest.fixture(name="app_client")
def client_fixture():
    """Get client and clear app dependency_overrides."""
    app_client = TestClient(app)

    test_settings = Settings(
        llm={
            "openai_token": "fake_token",
        },
        rate_limiter={"disabled": True},
        accounting={"disabled": True},
    )

    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_openrouter_models] = lambda: [
        OpenRouterModelResponse(
            **{
                "id": "openai/gpt-5-mini",
                "canonical_slug": "openai/gpt-5-mini",
                "hugging_face_id": None,
                "name": "OpenAI: GPT-5-mini",
                "created": 1721260800,
                "description": "Great model",
                "context_length": 128000,
                "architecture": {
                    "modality": "text+image->text",
                    "input_modalities": [
                        "text",
                    ],
                    "output_modalities": ["text"],
                    "tokenizer": "GPT",
                    "instruct_type": None,
                },
                "pricing": {
                    "prompt": "0.00000015",
                    "completion": "0.0000006",
                },
                "top_provider": {
                    "context_length": 128000,
                    "max_completion_tokens": 16384,
                    "is_moderated": True,
                },
                "per_request_limits": None,
                "supported_parameters": [
                    "tools",
                ],
            }
        )
    ]
    yield app_client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_openai_client():
    """Fake openai client."""
    m = MockOpenAIClient()
    m.set_response(
        create_mock_response(
            {"role": "assistant", "content": "sample response content"}
        )
    )
    return m


@pytest.fixture(name="get_weather_tool")
def fake_tool():
    """Fake get weather tool."""

    class FakeToolInput(BaseModel):
        location: str = Field(description="The location to get the weather for")

    class FakeToolMetadata(
        BaseModel
    ):  # Should be a BaseMetadata but we don't want httpx client here
        model_config = ConfigDict(extra="ignore", arbitrary_types_allowed=True)
        planet: str | None = None

    class NestedPartialOutput(BaseModel):
        param: str

    class FakeToolOutput(BaseModel):
        output: NestedPartialOutput

    class FakeTool(BaseTool):
        name: ClassVar[str] = "get_weather"
        name_frontend: ClassVar[str] = "Get Weather"
        description: ClassVar[str] = "Great description"
        description_frontend: ClassVar[str] = "Great description frontend"
        metadata: FakeToolMetadata
        input_schema: FakeToolInput
        hil: ClassVar[bool] = True

        async def arun(self) -> FakeToolOutput:
            if self.metadata.planet:
                return FakeToolOutput(
                    output=NestedPartialOutput(
                        param=f"It's sunny today in {self.input_schema.location} from planet {self.metadata.planet}."
                    )
                )
            return FakeToolOutput(output=NestedPartialOutput(param="It's sunny today."))

        @classmethod
        async def is_online(cls):
            return True

    return FakeTool


@pytest.fixture
def agent_handoff_tool():
    """Fake agent handoff tool."""

    class HandoffToolInput(BaseModel):
        pass

    class HandoffToolMetadata(
        BaseModel
    ):  # Should be a BaseMetadata but we don't want httpx client here
        to_agent: Agent
        model_config = ConfigDict(extra="ignore", arbitrary_types_allowed=True)

    class HandoffTool(BaseTool):
        name: ClassVar[str] = "agent_handoff_tool"
        description: ClassVar[str] = "Handoff to another agent."
        metadata: HandoffToolMetadata
        input_schema: HandoffToolInput
        output_type: ClassVar[type[Agent]] = Agent

        async def arun(self):
            return self.metadata.to_agent

    return HandoffTool


@pytest.fixture(autouse=True, scope="session")
def dont_look_at_app_env_file():
    """Never look inside of the .env.app when running unit tests."""
    Settings.model_config["env_file"] = None


@pytest.fixture(autouse=True, scope="session")
def dont_look_at_tasks_env_file():
    """Never look inside of the .env.tasks when running unit tests."""
    SettingsTasks.model_config["env_file"] = None


@pytest.fixture(autouse=True)
def dont_look_at_os_environ(monkeypatch):
    """Make sure that NEUROAGENT_* env vars are deleted from `os.environ`.

    Note that the `dont_look_at_env_file` fixture makes sure we don't read them from the .env file.
    This one is also important since `litellm` loads all variables from .env file
    on import into `os.environ` and we don't want to use them in tests.
    """
    for env_var in os.environ:
        if env_var.startswith("NEUROAGENT_"):
            # Delete all NEUROAGENT_* env vars
            monkeypatch.delenv(env_var, raising=False)


@pytest.fixture(autouse=True)
def disable_boto_metadata_lookup(monkeypatch):
    """When running tests, we don't want to make any requests to AWS.


    boto3.client("service_name") will try to load metadata from the internet.
    We disable this behavior to avoid network calls during tests.
    """
    monkeypatch.setenv("AWS_EC2_METADATA_DISABLED", "true")


@pytest.fixture(name="test_user_info")
def get_default_user_id_vlab_project():
    return (
        UUID("12345678-9123-4567-1234-890123456789"),
        UUID("12315678-5123-4567-4053-890126456789"),
        UUID("47939269-9123-4567-2934-918273640192"),
    )


# Don't make it a fixture so that it doesn't trigger on skipped tests
def mock_keycloak_user_identification(httpx_mock, test_user_info):
    user_id, vlab, proj = test_user_info
    # set keycloak={"issuer": "https://great_issuer.com"} in your settings
    fake_response = {
        "sub": str(user_id),
        "email_verified": False,
        "name": "Machine Learning Test User",
        "groups": [
            f"/proj/{vlab}/{proj}/admin",
            f"/proj/{str(vlab)[:-1] + '1'}/{str(proj)[:-1] + '1'}/member",
            f"/vlab/{vlab}/admin",
            f"/vlab/{str(vlab)[:-1] + '1'}/member",
        ],
        "preferred_username": "sbo-ml",
        "given_name": "Machine Learning",
        "family_name": "Test User",
        "email": "email@epfl.ch",
    }
    httpx_mock.add_response(
        url="https://great_issuer.com/protocol/openid-connect/userinfo",
        json=fake_response,
    )


@pytest_asyncio.fixture(name="db_connection")
async def setup_sql_db(request):
    # To start the postgresql database:
    # docker run -it --rm -p 5432:5432 -e POSTGRES_USER=test -e POSTGRES_PASSWORD=password postgres:latest
    # alembic -x url=postgresql://test:password@localhost:5432 upgrade head
    path = "postgresql+asyncpg://test:password@localhost:5432"
    try:
        async with create_async_engine(path).connect() as conn:
            pass
    except Exception:
        pytest.skip("Postgres database not connected")
    yield path
    engine = create_async_engine(path)
    metadata = MetaData()
    session = AsyncSession(bind=engine)
    async with engine.begin() as conn:
        await conn.run_sync(metadata.reflect)
        tables = metadata.tables
        await session.execute(tables["tool_calls"].delete())
        await session.execute(tables["messages"].delete())
        await session.execute(tables["threads"].delete())

    await session.commit()
    await engine.dispose()
    await session.aclose()


@pytest_asyncio.fixture
async def populate_db(db_connection, test_user_info):
    engine = create_async_engine(db_connection)
    session = AsyncSession(bind=engine)
    user_id, vlab, proj = test_user_info
    # Create a dummy thread
    thread = Threads(
        user_id=user_id,
        vlab_id=vlab,  # default
        project_id=proj,  # default
        title="Test Thread",
    )

    # Create four dummy messages associated with the thread
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"content": "This is my query.", "role": "user"}),
            thread=thread,
            is_complete=True,
        ),
        Messages(
            entity=Entity.AI_TOOL,
            content=json.dumps(
                {
                    "content": "",
                    "role": "assistant",
                    "tool_calls": {"name": "great-tool"},
                }
            ),
            thread=thread,
            is_complete=True,
        ),
        Messages(
            entity=Entity.TOOL,
            content=json.dumps({"content": "It's sunny today.", "role": "tool"}),
            thread=thread,
            is_complete=True,
        ),
        Messages(
            entity=Entity.AI_MESSAGE,
            content=json.dumps(
                {"content": "sample response content.", "role": "assistant"}
            ),
            thread=thread,
            is_complete=True,
        ),
    ]

    tool_call = ToolCalls(
        tool_call_id="mock_id_tc",
        name="get_weather",
        arguments=json.dumps({"location": "Geneva"}),
        validated=None,
        message=messages[1],
    )

    # Add them to the session
    session.add(thread)
    session.add_all(messages)
    session.add(tool_call)

    # Commit the transaction to persist them in the test database
    await session.commit()
    await session.refresh(thread)
    await session.refresh(tool_call)
    # Return the created objects so they can be used in tests
    yield {"thread": thread, "messages": messages, "tool_call": tool_call}, session
    await session.close()


@pytest.fixture(name="settings")
def settings():
    return Settings(
        llm={
            "openai_token": "fake_token",
        },
        rate_limiter={"disabled": True},
        accounting={"disabled": True},
    )


# Prevent tests from connecting to actual MCP servers
@pytest.fixture(autouse=True, scope="module")
def patch_mcp_servers():
    with patch("neuroagent.app.config.Path") as mock_path:
        # Set up the mock path chain
        mock_path.return_value.parent.parent.__truediv__.return_value.open = mock_open(
            read_data="{}"
        )
        yield
