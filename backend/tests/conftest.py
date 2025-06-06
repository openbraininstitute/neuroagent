"""Test configuration."""

import json
from pathlib import Path
from typing import ClassVar
from unittest.mock import Mock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, ToolCalls
from neuroagent.app.dependencies import Agent, get_settings
from neuroagent.app.main import app
from neuroagent.schemas import EmbeddedBrainRegion, EmbeddedBrainRegions
from neuroagent.tools.base_tool import BaseTool
from tests.mock_client import MockOpenAIClient, create_mock_response


@pytest.fixture(name="app_client")
def client_fixture():
    """Get client and clear app dependency_overrides."""
    app_client = TestClient(app)
    test_settings = Settings(
        tools={
            "literature": {
                "url": "fake_literature_url",
            },
        },
        openai={
            "token": "fake_token",
        },
        rate_limiter={"disabled": True},
        accounting={"disabled": True},
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
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
def dont_look_at_env_file():
    """Never look inside of the .env when running unit tests."""
    Settings.model_config["env_file"] = None


@pytest.fixture()
def patch_required_env(monkeypatch):
    monkeypatch.setenv("NEUROAGENT_TOOLS__LITERATURE__URL", "https://fake_url")
    monkeypatch.setenv("NEUROAGENT_OPENAI__TOKEN", "dummy")


# Don't make it a fixture so that it doesn't trigger on skipped tests
def mock_keycloak_user_identification(httpx_mock):
    # set keycloak={"issuer": "https://great_issuer.com"} in your settings
    fake_response = {
        "sub": "12345",
        "email_verified": False,
        "name": "Machine Learning Test User",
        "groups": [
            "/proj/test_vlab/test_project/admin",
            "/proj/test_vlab2/test_project2/member",
            "/vlab/test_vlab/admin",
            "/vlab/test_vlab2/member",
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


@pytest.fixture
def brain_region_json_path():
    br_path = Path(__file__).parent / "data" / "brainregion_hierarchy.json"
    return br_path


@pytest_asyncio.fixture
async def populate_db(db_connection):
    engine = create_async_engine(db_connection)
    session = AsyncSession(bind=engine)
    # Create a dummy thread
    thread = Threads(
        user_id="12345",
        vlab_id="test_vlab",  # default
        project_id="test_project",  # default
        title="Test Thread",
    )

    # Create four dummy messages associated with the thread
    messages = [
        Messages(
            entity=Entity.USER,
            content=json.dumps({"content": "This is my query."}),
            thread=thread,
            is_complete=True,
        ),
        Messages(
            entity=Entity.AI_TOOL,
            content=json.dumps({"content": ""}),
            thread=thread,
            is_complete=True,
        ),
        Messages(
            entity=Entity.TOOL,
            content=json.dumps({"content": "It's sunny today."}),
            thread=thread,
            is_complete=True,
        ),
        Messages(
            entity=Entity.AI_MESSAGE,
            content=json.dumps({"content": "sample response content."}),
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
        tools={
            "literature": {
                "url": "fake_literature_url",
            },
        },
        openai={
            "token": "fake_token",
        },
        rate_limiter={"disabled": True},
        accounting={"disabled": True},
    )


@pytest.fixture(autouse=True)
def mock_br_embeddings(monkeypatch):
    """Automatically mock br_embeddings for all tests"""
    mock_embeddings = [
        EmbeddedBrainRegions(
            regions=[EmbeddedBrainRegion(id="1234", name="test", hierarchy_level=0)],
            hierarchy_id="4567",
        )
    ]  # or whatever mock data you need

    def mock_get_br_embeddings(*args, **kwargs):
        return mock_embeddings

    monkeypatch.setattr("neuroagent.app.main.get_br_embeddings", mock_get_br_embeddings)
    monkeypatch.setattr("neuroagent.app.main.get_s3_client", lambda *params: Mock())
