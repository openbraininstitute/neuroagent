"""App dependencies."""

import logging
from functools import cache
from typing import Annotated, Any, AsyncIterator

import boto3
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from httpx import AsyncClient, HTTPStatusError
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import validate_project
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Threads
from neuroagent.app.schemas import UserInfo
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
    MorphologyViewerTool,
    PlotGeneratorTool,
    ResolveEntitiesTool,
    SCSGetAllTool,
    SCSGetOneTool,
    SCSPostTool,
    SemanticScholarTool,
    WebSearchTool,
)
from neuroagent.tools.base_tool import BaseTool

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
    client = AsyncClient(
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


async def get_user_info(
    token: Annotated[str, Depends(auth)],
    settings: Annotated[Settings, Depends(get_settings)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
) -> UserInfo:
    """Validate JWT token and returns user ID."""
    if settings.keycloak.user_info_endpoint:
        try:
            response = await httpx_client.get(
                settings.keycloak.user_info_endpoint,
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return UserInfo(**response.json())
        except HTTPStatusError:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
    else:
        raise HTTPException(status_code=404, detail="User info url not provided.")


def get_tool_list() -> list[type[BaseTool]]:
    """Return a raw list of all of the available tools."""
    return [
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
        PlotGeneratorTool,
        MorphologyViewerTool,
        WebSearchTool,
        SemanticScholarTool,
        # NowTool,
        # WeatherTool,
        # RandomPlotGeneratorTool,
    ]


async def get_selected_tools(
    request: Request, tool_list: Annotated[list[type[BaseTool]], Depends(get_tool_list)]
) -> list[type[BaseTool]]:
    """Get tools specified in the header from the frontend."""
    if request.method == "GET":
        return tool_list

    body = await request.json()
    if body.get("tool_selection") is None:
        return tool_list
    else:
        tool_map = {tool.name: tool for tool in tool_list}
        selected_tools = [
            tool_map[name] for name in body["tool_selection"] if name in tool_map.keys()
        ]
        return selected_tools


async def get_tool_embeddings(request: Request) -> dict[str, list[float]]:
    """Get the tool embeddings."""
    return request.app.state.tool_embeddings


def get_starting_agent(
    settings: Annotated[Settings, Depends(get_settings)],
    tool_list: Annotated[list[type[BaseTool]], Depends(get_selected_tools)],
) -> Agent:
    """Get the starting agent."""
    logger.info(f"Loading model {settings.openai.model}.")
    base_instructions = """You are a helpful assistant helping scientists with neuro-scientific questions.
                You must always specify in your answers from which brain regions the information is extracted.
                Do no blindly repeat the brain region requested by the user, use the output of the tools instead."""

    storage_instructions = (
        f"All files in storage can be viewed under {settings.misc.frontend_url}/viewer/{{storage_id}}. "
        "When referencing storage files, always replace {{storage_id}} with the actual storage ID. "
        "Format the links as standard markdown links like: [Description](URL), do not try to embed them as images."
        if settings.misc.frontend_url
        else "Never try to generate links to internal storage ids"
    )

    agent = Agent(
        name="Agent",
        instructions=f"{base_instructions}\n{storage_instructions}",
        tools=tool_list,
        model=settings.openai.model,
    )
    return agent


async def get_thread(
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    thread_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Threads:
    """Check if the current thread / user matches."""
    thread_result = await session.execute(
        select(Threads).where(
            Threads.user_id == user_info.sub, Threads.thread_id == thread_id
        )
    )
    thread = thread_result.scalars().one_or_none()
    if not thread:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": "Thread not found.",
            },
        )
    validate_project(
        groups=user_info.groups,
        virtual_lab_id=thread.vlab_id,
        project_id=thread.project_id,
    )
    return thread


def get_s3_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> Any:
    """Get the S3 client."""
    if settings.storage.access_key is None:
        access_key = None
    else:
        access_key = settings.storage.access_key.get_secret_value()

    if settings.storage.secret_key is None:
        secret_key = None
    else:
        secret_key = settings.storage.secret_key.get_secret_value()

    return boto3.client(
        "s3",
        endpoint_url=settings.storage.endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=None,
        config=boto3.session.Config(signature_version="s3v4"),
    )


def get_context_variables(
    settings: Annotated[Settings, Depends(get_settings)],
    starting_agent: Annotated[Agent, Depends(get_starting_agent)],
    token: Annotated[str, Depends(auth)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
    thread: Annotated[Threads, Depends(get_thread)],
    s3_client: Annotated[Any, Depends(get_s3_client)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
) -> dict[str, Any]:
    """Get the context variables to feed the tool's metadata."""
    return {
        "starting_agent": starting_agent,
        "token": token,
        "retriever_k": settings.tools.literature.retriever_k,
        "reranker_k": settings.tools.literature.reranker_k,
        "use_reranker": settings.tools.literature.use_reranker,
        "literature_search_url": settings.tools.literature.url,
        "knowledge_graph_url": settings.knowledge_graph.url,
        "me_model_search_size": settings.tools.me_model.search_size,
        "bucket_name": settings.storage.bucket_name,
        "brainregion_hierarchy_storage_key": settings.storage.brain_region_hierarchy_key,
        "celltypes_hierarchy_storage_key": settings.storage.cell_type_hierarchy_key,
        "morpho_search_size": settings.tools.morpho.search_size,
        "kg_morpho_feature_search_size": settings.tools.kg_morpho_features.search_size,
        "trace_search_size": settings.tools.trace.search_size,
        "kg_sparql_url": settings.knowledge_graph.sparql_url,
        "kg_class_view_url": settings.knowledge_graph.class_view_url,
        "bluenaas_url": settings.tools.bluenaas.url,
        "httpx_client": httpx_client,
        "vlab_id": thread.vlab_id,
        "project_id": thread.project_id,
        "s3_client": s3_client,
        "user_id": user_info.sub,
        "thread_id": thread.thread_id,
        "tavily_api_key": settings.tools.web_search.tavily_api_key,
        "semantic_scholar_api_key": settings.tools.semantic_scholar.api_key,
    }


def get_healthcheck_variables(
    settings: Annotated[Settings, Depends(get_settings)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
) -> dict[str, Any]:
    """Get the variables needed for healthcheck endpoints.

    We need to add the trailing slash to the urls to make
    sure the load balancer will route the requests to the
    correct service.
    """
    return {
        "httpx_client": httpx_client,
        "literature_search_url": settings.tools.literature.url.rstrip("/") + "/",
        "knowledge_graph_url": settings.knowledge_graph.base_url.rstrip("/") + "/",
        "bluenaas_url": settings.tools.bluenaas.url.rstrip("/") + "/",
    }


def get_agents_routine(
    openai: Annotated[AsyncOpenAI | None, Depends(get_openai_client)],
) -> AgentsRoutine:
    """Get the AgentRoutine client."""
    return AgentsRoutine(openai)
