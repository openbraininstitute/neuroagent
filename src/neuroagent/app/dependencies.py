"""App dependencies."""

import logging
from functools import cache
from typing import Annotated, Any, AsyncIterator

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from httpx import AsyncClient, HTTPStatusError
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.config import Settings
from neuroagent.new_types import Agent
from neuroagent.tools import (
    ElectrophysFeatureTool,
    GetMorphoTool,
    GetTracesTool,
    KGMorphoFeatureTool,
    LiteratureSearchTool,
    MEModelGetAllTool,
    MEModelGetOneTool,
    MorphologyFeatureTool,
    ResolveEntitiesTool,
    SCSGetAllTool,
    SCSGetOneTool,
    SCSPostTool,
)

logger = logging.getLogger(__name__)


class HTTPBearerDirect(HTTPBearer):
    """HTTPBearer class that returns directly the token in the call."""

    async def __call__(self, request: Request) -> str | None:  # type: ignore
        """Intercept the bearer token in the headers."""
        auth_credentials = await super().__call__(request)
        return auth_credentials.credentials if auth_credentials else None


auth = HTTPBearerDirect(auto_error=False)


@cache
def get_settings() -> Settings:
    """Get the global settings."""
    logger.info("Reading the environment and instantiating settings")
    return Settings()


async def get_httpx_client(request: Request) -> AsyncIterator[AsyncClient]:
    """Manage the httpx client for the request."""
    client = AsyncClient(  # nosec B501
        timeout=300.0,
        verify=False,
        headers={"x-request-id": request.headers["x-request-id"]},
    )
    try:
        yield client
    finally:
        await client.aclose()


async def get_openai_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncIterator[AsyncOpenAI | None]:
    """Get the OpenAi Async client."""
    if not settings.openai.token:
        yield None
    else:
        try:
            client = AsyncOpenAI(api_key=settings.openai.token.get_secret_value())
            yield client
        finally:
            await client.close()


def get_connection_string(
    settings: Annotated[Settings, Depends(get_settings)],
) -> str | None:
    """Get the db interacting class for chat agent."""
    if settings.db.prefix:
        connection_string = settings.db.prefix
        if settings.db.user and settings.db.password:
            # Add authentication.
            connection_string += (
                f"{settings.db.user}:{settings.db.password.get_secret_value()}@"
            )
        if settings.db.host:
            # Either in file DB or connect to remote host.
            connection_string += settings.db.host
        if settings.db.port:
            # Add the port if remote host.
            connection_string += f":{settings.db.port}"
        if settings.db.name:
            # Add database name if specified.
            connection_string += f"/{settings.db.name}"
        return connection_string
    else:
        return None


def get_engine(request: Request) -> AsyncEngine | None:
    """Get the SQL engine."""
    return request.app.state.engine


async def get_session(
    engine: Annotated[AsyncEngine | None, Depends(get_engine)],
) -> AsyncIterator[AsyncSession]:
    """Yield a session per request."""
    if not engine:
        raise HTTPException(
            status_code=500,
            detail={
                "detail": "Couldn't connect to the SQL DB.",
            },
        )
    async with AsyncSession(engine) as session:
        yield session


async def get_user_id(
    token: Annotated[str, Depends(auth)],
    settings: Annotated[Settings, Depends(get_settings)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
) -> str:
    """Validate JWT token and returns user ID."""
    if settings.keycloak.user_info_endpoint:
        try:
            response = await httpx_client.get(
                settings.keycloak.user_info_endpoint,
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            user_info = response.json()
            return user_info["sub"]
        except HTTPStatusError:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
    else:
        raise HTTPException(status_code=404, detail="user info url not provided.")


def get_starting_agent(
    settings: Annotated[Settings, Depends(get_settings)],
) -> Agent:
    """Get the starting agent."""
    logger.info(f"Loading model {settings.openai.model}.")
    agent = Agent(
        name="Agent",
        instructions="""You are a helpful assistant helping scientists with neuro-scientific questions.
                You must always specify in your answers from which brain regions the information is extracted.
                Do no blindly repeat the brain region requested by the user, use the output of the tools instead.""",
        tools=[
            SCSGetAllTool,
            SCSGetOneTool,
            SCSPostTool,
            MEModelGetAllTool,
            MEModelGetOneTool,
            LiteratureSearchTool,
            ElectrophysFeatureTool,
            GetMorphoTool,
            KGMorphoFeatureTool,
            MorphologyFeatureTool,
            ResolveEntitiesTool,
            GetTracesTool,
            # NowTool,
            # WeatherTool,
        ],
        model=settings.openai.model,
    )
    return agent


def get_context_variables(
    settings: Annotated[Settings, Depends(get_settings)],
    starting_agent: Annotated[Agent, Depends(get_starting_agent)],
    token: Annotated[str, Depends(auth)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
) -> dict[str, Any]:
    """Get the global context variables to feed the tool's metadata."""
    return {
        "starting_agent": starting_agent,
        "token": token,
        "retriever_k": settings.tools.literature.retriever_k,
        "reranker_k": settings.tools.literature.reranker_k,
        "use_reranker": settings.tools.literature.use_reranker,
        "literature_search_url": settings.tools.literature.url,
        "knowledge_graph_url": settings.knowledge_graph.url,
        "me_model_search_size": settings.tools.me_model.search_size,
        "brainregion_path": settings.knowledge_graph.br_saving_path,
        "celltypes_path": settings.knowledge_graph.ct_saving_path,
        "morpho_search_size": settings.tools.morpho.search_size,
        "kg_morpho_feature_search_size": settings.tools.kg_morpho_features.search_size,
        "trace_search_size": settings.tools.trace.search_size,
        "kg_sparql_url": settings.knowledge_graph.sparql_url,
        "kg_class_view_url": settings.knowledge_graph.class_view_url,
        "bluenaas_url": settings.tools.bluenaas.url,
        "httpx_client": httpx_client,
    }


def get_agents_routine(
    openai: Annotated[AsyncOpenAI | None, Depends(get_openai_client)],
) -> AgentsRoutine:
    """Get the AgentRoutine client."""
    return AgentsRoutine(openai)
