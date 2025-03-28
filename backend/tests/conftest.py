"""Test configuration."""

import json
from pathlib import Path
from typing import ClassVar

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads, ToolCalls
from neuroagent.app.dependencies import get_settings
from neuroagent.app.main import app
from neuroagent.base_types import Agent, AgentsNames, BaseTool
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
        knowledge_graph={
            "base_url": "https://fake_url/api/nexus/v1",
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
        location: str = Field(..., description="The location to get the weather for")

    class FakeToolMetadata(
        BaseModel
    ):  # Should be a BaseMetadata but we don't want httpx client here
        model_config = ConfigDict(extra="ignore", arbitrary_types_allowed=True)
        planet: str | None = None

    class FakeTool(BaseTool):
        name: ClassVar[str] = "get_weather"
        name_frontend: ClassVar[str] = "Get Weather"
        description: ClassVar[str] = "Great description"
        description_frontend: ClassVar[str] = "Great description frontend"
        agents: ClassVar[list[str]] = [AgentsNames.TRIAGE_AGENT.value]
        metadata: FakeToolMetadata
        input_schema: FakeToolInput
        hil: ClassVar[bool] = True

        async def arun(self):
            if self.metadata.planet:
                return f"It's sunny today in {self.input_schema.location} from planet {self.metadata.planet}."
            return "It's sunny today."

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
        agents: ClassVar[list[str]] = [AgentsNames.TRIAGE_AGENT.value]
        metadata: HandoffToolMetadata
        input_schema: HandoffToolInput

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
    monkeypatch.setenv(
        "NEUROAGENT_KNOWLEDGE_GRAPH__BASE_URL", "https://fake_url/api/nexus/v1"
    )
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


@pytest_asyncio.fixture(params=["sqlite", "postgresql"], name="db_connection")
async def setup_sql_db(request):
    db_type = request.param

    # To start the postgresql database:
    # docker run -it --rm -p 5432:5432 -e POSTGRES_USER=test -e POSTGRES_PASSWORD=password postgres:latest
    path = (
        "sqlite+aiosqlite:///sqlite.db"
        if db_type == "sqlite"
        else "postgresql+asyncpg://test:password@localhost:5432"
    )
    if db_type == "postgresql":
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
        for table in reversed(metadata.tables.values()):
            if table.name != "alembic_version":
                await session.execute(table.delete())

    await session.commit()
    await engine.dispose()
    await session.aclose()


@pytest.fixture
def get_resolve_query_output():
    with open("tests/data/resolve_query.json") as f:
        outputs = json.loads(f.read())
    return outputs


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
            order=0,
            entity=Entity.USER,
            content=json.dumps({"content": "This is my query."}),
            thread=thread,
        ),
        Messages(
            order=1,
            entity=Entity.AI_TOOL,
            content=json.dumps({"content": ""}),
            thread=thread,
        ),
        Messages(
            order=2,
            entity=Entity.TOOL,
            content=json.dumps({"content": "It's sunny today."}),
            thread=thread,
        ),
        Messages(
            order=3,
            entity=Entity.AI_MESSAGE,
            content=json.dumps({"content": "sample response content."}),
            thread=thread,
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
        knowledge_graph={
            "base_url": "https://fake_url/api/nexus/v1",
        },
        openai={
            "token": "fake_token",
        },
        rate_limiter={"disabled": True},
        accounting={"disabled": True},
    )
