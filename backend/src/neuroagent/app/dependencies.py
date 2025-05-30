"""App dependencies."""

import logging
from datetime import datetime, timezone
from functools import cache
from typing import Annotated, Any, AsyncIterator

import boto3
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from httpx import AsyncClient, HTTPStatusError
from obp_accounting_sdk import AsyncAccountingSessionFactory
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from semantic_router.routers import SemanticRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import validate_project
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Threads
from neuroagent.app.schemas import UserInfo
from neuroagent.mcp import MCPClient, create_dynamic_tool
from neuroagent.new_types import Agent
from neuroagent.tools import (
    ElectrophysFeatureTool,
    GetMorphoTool,
    GetTracesTool,
    KGMorphoFeatureTool,
    LiteratureSearchTool,
    MEModelGetAllTool,
    MEModelGetOneTool,
    MorphologyViewerTool,
    MorphoMetricsTool,
    PlotGeneratorTool,
    ResolveBrainRegionTool,
    ResolveMtypeTool,
    SCSGetAllTool,
    SCSGetOneTool,
    SCSPlotTool,
    SCSPostTool,
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


async def get_httpx_client(
    request: Request, token: Annotated[str, Depends(auth)]
) -> AsyncIterator[AsyncClient]:
    """Manage the httpx client for the request."""
    client = AsyncClient(
        timeout=300.0,
        verify=False,
        headers={
            "x-request-id": request.headers["x-request-id"],
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        yield client
    finally:
        await client.aclose()


def get_accounting_session_factory(request: Request) -> AsyncAccountingSessionFactory:
    """Get the accounting session factory."""
    return request.app.state.accounting_session_factory


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
            )
            response.raise_for_status()
            return UserInfo(**response.json())
        except HTTPStatusError:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
    else:
        raise HTTPException(status_code=404, detail="User info url not provided.")


def get_mcp_client(request: Request) -> MCPClient | None:
    """Get the MCP client from the app state."""
    if request.app.state.mcp_client is None:
        return None
    return request.app.state.mcp_client


@cache
def get_mcp_tool_list(
    mcp_client: Annotated[MCPClient | None, Depends(get_mcp_client)],
) -> list[type[BaseTool]]:
    """Get the list of tools from the MCP server."""
    if mcp_client is None:
        return []

    dynamic_tools: list[type[BaseTool]] = []

    # Iterate through all tools from all servers
    for server_name, tools in mcp_client.tools.items():
        for tool in tools:
            # Create a dynamic tool class for each MCP tool
            dynamic_tool = create_dynamic_tool(
                server_name=server_name,
                tool_name=tool.name,
                tool_description=tool.description
                if tool.description
                else "NO DESCRIPTION",
                input_schema_serialized=tool.inputSchema,
                session=mcp_client.sessions[server_name],
            )
            dynamic_tools.append(dynamic_tool)

    return dynamic_tools


def get_tool_list(
    mcp_tool_list: Annotated[list[type[BaseTool]], Depends(get_mcp_tool_list)],
) -> list[type[BaseTool]]:
    """Return a raw list of all of the available tools."""
    internal_tool_list: list[type[BaseTool]] = [
        SCSGetAllTool,
        SCSGetOneTool,
        SCSPlotTool,
        SCSPostTool,
        MEModelGetAllTool,
        MEModelGetOneTool,
        LiteratureSearchTool,
        ElectrophysFeatureTool,
        GetMorphoTool,
        KGMorphoFeatureTool,
        ResolveBrainRegionTool,
        ResolveMtypeTool,
        MorphoMetricsTool,
        GetTracesTool,
        PlotGeneratorTool,
        MorphologyViewerTool,
        WebSearchTool,
        # NowTool,
        # WeatherTool,
        # RandomPlotGeneratorTool,
    ]

    all_tools = internal_tool_list + mcp_tool_list

    return all_tools


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


def get_starting_agent(
    settings: Annotated[Settings, Depends(get_settings)],
    tool_list: Annotated[list[type[BaseTool]], Depends(get_selected_tools)],
) -> Agent:
    """Get the starting agent."""
    logger.info(f"Loading model {settings.openai.model}.")
    base_instructions = f"""You are a helpful assistant helping scientists with neuro-scientific questions.
                The current date and time is {datetime.now(timezone.utc).isoformat()}.
                You must always specify in your answers from which brain regions the information is extracted.
                Do not blindly repeat the brain region requested by the user, use the output of the tools instead.
                Never try to generate links to internal storage ids.
                You are embedded in a platform called the Open Brain Platform.
                The Open Brain Platform allows an atlas driven exploration of mouse, rat and human brain data with different artifacts related to experimental and model data, more specifically: neuron morphology
                (neuron structure including axons, soma and dendrite), electrophysiological recording (ie the electrical behavior of the neuron), ion channel, neuron density, bouton density, synapses, connections, electrical models also referred to as e-models, me-models which is the model of neuron with a specific morphology and electrical type, and the synaptome dictating how neurons are connected together.
                The platform also allows users to explore and build digital brain models at different scales ranging from molecular level to single neuron and larger circuits and brain regions.
                Users can also customize the models or create their own by changing the cellular composition, to then run simulation experiments and perform analysis.
                The models currently available on the platform are the metabolism and NGV unit as a notebook, and the single neuron, synaptome simulation. The other models will be released later starting with microcircuits paired neurons and then brain region, brain system and whole brain.
                The platform has many notebooks that can be downloaded and executed remotely for now. A feature to run them on the platform will be available soon.
                The platform has an AI Assistant for literature search allowing users to identify articles related to the brain area and artifacts they are interested in. At a later stage, the AI assistant will be further developed to access specific tools on the platform. PLEASE ALWAYS RESPECT THE TOOL OUTPUTS AND DON'T INVENT INFORMATION NOT PRESENT IN THE OUTPUTS."""

    agent = Agent(
        name="Agent",
        instructions=base_instructions,
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


def get_semantic_routes(request: Request) -> SemanticRouter | None:
    """Get the semantic route object for basic guardrails."""
    return request.app.state.semantic_router


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
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    starting_agent: Annotated[Agent, Depends(get_starting_agent)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
    thread: Annotated[Threads, Depends(get_thread)],
    s3_client: Annotated[Any, Depends(get_s3_client)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
) -> dict[str, Any]:
    """Get the context variables to feed the tool's metadata."""
    return {
        "bluenaas_url": settings.tools.bluenaas.url,
        "brainregion_embeddings": request.app.state.br_embeddings,
        "brainregion_hierarchy_storage_key": settings.storage.brain_region_hierarchy_key,
        "bucket_name": settings.storage.bucket_name,
        "celltypes_hierarchy_storage_key": settings.storage.cell_type_hierarchy_key,
        "entitycore_url": settings.tools.entitycore.url,
        "httpx_client": httpx_client,
        "kg_class_view_url": settings.knowledge_graph.class_view_url,
        "kg_morpho_feature_search_size": settings.tools.kg_morpho_features.search_size,
        "kg_sparql_url": settings.knowledge_graph.sparql_url,
        "knowledge_graph_url": settings.knowledge_graph.url,
        "literature_search_url": settings.tools.literature.url,
        "me_model_search_size": settings.tools.me_model.search_size,
        "obi_one_url": settings.tools.obi_one.url,
        "openai_client": openai_client,
        "project_id": thread.project_id,
        "retriever_k": settings.tools.literature.retriever_k,
        "s3_client": s3_client,
        "starting_agent": starting_agent,
        "tavily_api_key": settings.tools.web_search.tavily_api_key,
        "thread_id": thread.thread_id,
        "trace_search_size": settings.tools.trace.search_size,
        "use_reranker": settings.tools.literature.use_reranker,
        "user_id": user_info.sub,
        "vlab_id": thread.vlab_id,
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
        "bluenaas_url": settings.tools.bluenaas.url.rstrip("/") + "/",
        "entitycore_url": settings.tools.entitycore.url.rstrip("/") + "/",
        "httpx_client": httpx_client,
        "knowledge_graph_url": settings.knowledge_graph.base_url.rstrip("/") + "/",
        "literature_search_url": settings.tools.literature.url.rstrip("/") + "/",
        "obi_one_url": settings.tools.obi_one.url.rstrip("/") + "/",
    }


def get_agents_routine(
    openai: Annotated[AsyncOpenAI | None, Depends(get_openai_client)],
) -> AgentsRoutine:
    """Get the AgentRoutine client."""
    return AgentsRoutine(openai)


def get_redis_client(request: Request) -> aioredis.Redis | None:
    """Get the Redis client from app state.

    Parameters
    ----------
    request : Request
        The FastAPI request object

    Returns
    -------
    aioredis.Redis | None
        The Redis client instance or None if not configured
    """
    return request.app.state.redis_client
