"""App dependencies."""

import logging
import re
from datetime import datetime, timezone
from functools import cache
from pathlib import Path
from typing import Annotated, Any, AsyncIterator

import boto3
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from httpx import AsyncClient, HTTPStatusError, get
from obp_accounting_sdk import AsyncAccountingSessionFactory
from openai import AsyncOpenAI
from redis import asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from starlette.status import HTTP_401_UNAUTHORIZED

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.app_utils import filter_tools_by_conversation, validate_project
from neuroagent.app.config import Settings
from neuroagent.app.database.sql_schemas import Entity, Messages, Threads
from neuroagent.app.schemas import OpenRouterModelResponse, UserInfo
from neuroagent.executor import WasmExecutor
from neuroagent.mcp import MCPClient, create_dynamic_tool
from neuroagent.new_types import Agent
from neuroagent.tools import (
    AssetDownloadOneTool,
    AssetGetAllTool,
    AssetGetOneTool,
    BrainAtlasGetAllTool,
    BrainAtlasGetOneTool,
    BrainRegionGetAllTool,
    BrainRegionGetOneTool,
    BrainRegionHierarchyGetAllTool,
    BrainRegionHierarchyGetOneTool,
    CellMorphologyGetAllTool,
    CellMorphologyGetOneTool,
    CircuitGetAllTool,
    CircuitGetOneTool,
    CircuitMetricGetOneTool,
    CircuitNodesetsGetOneTool,
    CircuitPopulationAnalysisTool,
    CircuitPopulationGetOneTool,
    ContextAnalyzerTool,
    ContributionGetAllTool,
    ContributionGetOneTool,
    ElectricalCellRecordingGetAllTool,
    ElectricalCellRecordingGetOneTool,
    EModelGetAllTool,
    EModelGetOneTool,
    EphysMetricsGetOneTool,
    EtypeGetAllTool,
    EtypeGetOneTool,
    ExperimentalBoutonDensityGetAllTool,
    ExperimentalBoutonDensityGetOneTool,
    ExperimentalNeuronDensityGetAllTool,
    ExperimentalNeuronDensityGetOneTool,
    ExperimentalSynapsesPerConnectionGetAllTool,
    ExperimentalSynapsesPerConnectionGetOneTool,
    GenerateSimulationsConfigTool,
    IonChannelGetAllTool,
    IonChannelGetOneTool,
    IonChannelModelGetAllTool,
    IonChannelModelGetOneTool,
    IonChannelRecordingGetAllTool,
    IonChannelRecordingGetOneTool,
    MeasurementAnnotationGetAllTool,
    MeasurementAnnotationGetOneTool,
    MEModelGetAllTool,
    MEModelGetOneTool,
    MorphometricsGetOneTool,
    MtypeGetAllTool,
    MtypeGetOneTool,
    OBIExpertTool,
    OrganizationGetAllTool,
    OrganizationGetOneTool,
    PersonGetAllTool,
    PersonGetOneTool,
    PlotElectricalCellRecordingGetOneTool,
    PlotMorphologyGetOneTool,
    RunPythonTool,
    SimulationCampaignGetAllTool,
    SimulationCampaignGetOneTool,
    SimulationExecutionGetAllTool,
    SimulationExecutionGetOneTool,
    SimulationGenerationGetAllTool,
    SimulationGenerationGetOneTool,
    SimulationGetAllTool,
    SimulationGetOneTool,
    SimulationResultGetAllTool,
    SimulationResultGetOneTool,
    SingleNeuronSimulationGetAllTool,
    SingleNeuronSimulationGetOneTool,
    SingleNeuronSynaptomeGetAllTool,
    SingleNeuronSynaptomeGetOneTool,
    SingleNeuronSynaptomeSimulationGetAllTool,
    SingleNeuronSynaptomeSimulationGetOneTool,
    SpeciesGetAllTool,
    SpeciesGetOneTool,
    StrainGetAllTool,
    StrainGetOneTool,
    SubjectGetAllTool,
    SubjectGetOneTool,
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
        verify=False,  # nosec: B501
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


def get_python_sandbox(request: Request) -> WasmExecutor:
    """Get the python sandbox."""
    return request.app.state.python_sandbox


async def get_openai_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncIterator[AsyncOpenAI | None]:
    """Get the OpenAi Async client."""
    if not settings.llm.openai_token:
        yield None
    else:
        try:
            client = AsyncOpenAI(
                api_key=settings.llm.openai_token.get_secret_value(),
                base_url=settings.llm.openai_base_url,
            )
            yield client
        finally:
            await client.close()


async def get_openrouter_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncIterator[AsyncOpenAI | None]:
    """Get the OpenAi Async client."""
    if not settings.llm.open_router_token:
        yield None
    else:
        try:
            client = AsyncOpenAI(
                api_key=settings.llm.open_router_token.get_secret_value(),
                base_url="https://openrouter.ai/api/v1",
            )
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


def get_mcp_client(request: Request) -> MCPClient | None:
    """Get the MCP client from the app state."""
    if request.app.state.mcp_client is None:
        return None
    return request.app.state.mcp_client


@cache
def get_openrouter_models(
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[OpenRouterModelResponse]:
    """Ping Openrouter to get available models."""
    response = get("https://openrouter.ai/api/v1/models")
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail={
                "error": "Something went wrong. Could not retrieve list of models."
            },
        )
    models = [OpenRouterModelResponse(**model) for model in response.json()["data"]]
    filtered_models = [
        model
        for model in models
        if re.match(settings.llm.whitelisted_model_ids_regex, model.id)
    ]
    return filtered_models


@cache
def get_mcp_tool_list(
    mcp_client: Annotated[MCPClient | None, Depends(get_mcp_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[type[BaseTool]]:
    """Get the list of tools from the MCP server."""
    if mcp_client is None:
        return []

    dynamic_tools: list[type[BaseTool]] = []

    # Iterate through all tools from all servers
    for server_name, tools in mcp_client.tools.items():
        # Create a dynamic tool class for each MCP tool
        for tool in tools:
            # Find tool metadata associated to the current tool in the settings
            server_tool_metadata = settings.mcp.servers
            if server_tool_metadata:
                for server in server_tool_metadata.values():
                    tool_metadata = (
                        next(
                            (
                                v
                                for v in server.tool_metadata.values()
                                if v.name == tool.name
                            ),
                            None,
                        )
                        if server.tool_metadata is not None
                        else None
                    )
                    if tool_metadata is not None:
                        break
            else:
                tool_metadata = None

            dynamic_tool = create_dynamic_tool(
                tool_name=tool.name,
                tool_name_frontend=tool_metadata.name_frontend
                if tool_metadata
                else None,
                tool_name_mapping=mcp_client.tool_name_mapping,
                tool_description=tool_metadata.description
                or tool.description
                or "NO DESCRIPTION"
                if tool_metadata
                else tool.description or "NO DESCRIPTION",
                tool_description_frontend=tool_metadata.description_frontend
                if tool_metadata
                else None,
                utterance_list=tool_metadata.utterances if tool_metadata else None,
                input_schema_serialized=tool.inputSchema,
                session=mcp_client.sessions[server_name],
            )
            dynamic_tools.append(dynamic_tool)

    return dynamic_tools


def get_tool_list(
    mcp_tool_list: Annotated[list[type[BaseTool]], Depends(get_mcp_tool_list)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[type[BaseTool]]:
    """Return a raw list of all of the available tools."""
    internal_tool_list: list[type[BaseTool]] = [
        AssetDownloadOneTool,
        AssetGetAllTool,
        AssetGetOneTool,
        BrainAtlasGetAllTool,
        BrainAtlasGetOneTool,
        BrainRegionGetAllTool,
        BrainRegionGetOneTool,
        BrainRegionHierarchyGetAllTool,
        BrainRegionHierarchyGetOneTool,
        CellMorphologyGetAllTool,
        CellMorphologyGetOneTool,
        CircuitGetAllTool,
        CircuitGetOneTool,
        CircuitMetricGetOneTool,
        CircuitNodesetsGetOneTool,
        CircuitPopulationAnalysisTool,
        CircuitPopulationGetOneTool,
        ContextAnalyzerTool,
        ContributionGetAllTool,
        ContributionGetOneTool,
        ElectricalCellRecordingGetAllTool,
        ElectricalCellRecordingGetOneTool,
        EModelGetAllTool,
        EModelGetOneTool,
        EphysMetricsGetOneTool,
        EtypeGetAllTool,
        EtypeGetOneTool,
        ExperimentalBoutonDensityGetAllTool,
        ExperimentalBoutonDensityGetOneTool,
        ExperimentalNeuronDensityGetAllTool,
        ExperimentalNeuronDensityGetOneTool,
        ExperimentalSynapsesPerConnectionGetAllTool,
        ExperimentalSynapsesPerConnectionGetOneTool,
        GenerateSimulationsConfigTool,
        IonChannelGetAllTool,
        IonChannelGetOneTool,
        IonChannelModelGetAllTool,
        IonChannelModelGetOneTool,
        IonChannelRecordingGetAllTool,
        IonChannelRecordingGetOneTool,
        MeasurementAnnotationGetAllTool,
        MeasurementAnnotationGetOneTool,
        MEModelGetAllTool,
        MEModelGetOneTool,
        MorphometricsGetOneTool,
        MtypeGetAllTool,
        MtypeGetOneTool,
        OBIExpertTool,
        OrganizationGetAllTool,
        OrganizationGetOneTool,
        PersonGetAllTool,
        PersonGetOneTool,
        PlotElectricalCellRecordingGetOneTool,
        PlotMorphologyGetOneTool,
        SimulationCampaignGetAllTool,
        SimulationCampaignGetOneTool,
        SimulationExecutionGetAllTool,
        SimulationExecutionGetOneTool,
        SimulationGenerationGetAllTool,
        SimulationGenerationGetOneTool,
        SimulationGetAllTool,
        SimulationGetOneTool,
        SimulationResultGetAllTool,
        SimulationResultGetOneTool,
        SingleNeuronSimulationGetAllTool,
        SingleNeuronSimulationGetOneTool,
        SingleNeuronSynaptomeGetAllTool,
        SingleNeuronSynaptomeGetOneTool,
        SingleNeuronSynaptomeSimulationGetAllTool,
        SingleNeuronSynaptomeSimulationGetOneTool,
        SpeciesGetAllTool,
        SpeciesGetOneTool,
        StrainGetAllTool,
        StrainGetOneTool,
        SubjectGetAllTool,
        SubjectGetOneTool,
        RunPythonTool,
        # NowTool,
        # WeatherTool,
    ]

    all_tools = internal_tool_list + mcp_tool_list

    return (
        [
            tool
            for tool in all_tools
            if re.match(settings.tools.whitelisted_tool_regex, tool.name)
        ]
        if settings.tools.whitelisted_tool_regex
        else []
    )


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


async def filtered_tools(
    request: Request,
    thread: Annotated[Threads, Depends(get_thread)],
    tool_list: Annotated[list[type[BaseTool]], Depends(get_selected_tools)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openrouter_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[type[BaseTool]]:
    """Based on the current conversation, select relevant tools."""
    if request.method == "GET":
        return tool_list

    body = await request.json()

    # Awaiting here makes downstream calls already loaded so no performance issue
    messages: list[Messages] = await thread.awaitable_attrs.messages
    if (
        not messages
        or messages[-1].entity == Entity.AI_MESSAGE
        or not messages[-1].is_complete
    ):
        messages.append(
            Messages(
                thread_id=thread.thread_id,
                entity=Entity.USER,
                content={"role": "user", "content": body["content"]},
                is_complete=True,
            )
        )

        if not tool_list:
            return []

        return await filter_tools_by_conversation(
            messages=messages,
            tool_list=tool_list,
            openai_client=openai_client,
            min_tool_selection=settings.tools.min_tool_selection,
        )

    # HIL
    else:
        # We reuse the tools selected for the previous USER message
        last_user_message = next(
            message for message in reversed(messages) if message.entity == Entity.USER
        )
        previously_selected_tools = [
            selected.tool_name
            for selected in await last_user_message.awaitable_attrs.tool_selection
        ]
        return [tool for tool in tool_list if tool.name in previously_selected_tools]


@cache
def get_rules_dir() -> Path:
    """Get the path to the rules directory."""
    current_file = Path(__file__)
    rules_dir = current_file.parent.parent / "rules"
    return rules_dir


@cache
def get_system_prompt(rules_dir: Annotated[Path, Depends(get_rules_dir)]) -> str:
    """Get the concatenated rules from all .mdc files in the rules directory."""
    # Initialize the system prompt with base instructions
    system_prompt = """# NEUROSCIENCE AI ASSISTANT

You are a neuroscience AI assistant for the Open Brain Platform.

"""

    # Check if rules directory exists
    if not rules_dir.exists():
        system_prompt += f"""
# CURRENT CONTEXT

Current time: {datetime.now(timezone.utc).isoformat()}"""
        return system_prompt

    # Find all .mdc files in the rules directory
    mdc_files = list(rules_dir.glob("*.mdc"))

    # Sort files for consistent ordering
    mdc_files.sort()

    # Read and concatenate all rule files
    for mdc_file in mdc_files:
        try:
            content = mdc_file.read_text(encoding="utf-8").strip()
            if content:
                # Remove YAML frontmatter if present (lines between --- markers)
                lines = content.split("\n")
                filtered_lines = []
                in_frontmatter = False

                for line in lines:
                    if line.strip() == "---":
                        in_frontmatter = not in_frontmatter
                        continue
                    if not in_frontmatter:
                        filtered_lines.append(line)

                # Rejoin the content without frontmatter
                clean_content = "\n".join(filtered_lines).strip()

                if clean_content:
                    # Add the content with a clear boundary
                    system_prompt += f"\n{clean_content}\n\n"
        except Exception as e:
            raise Exception(f"Failed to read rule file {mdc_file}: {e}")

    system_prompt += f"""
# CURRENT CONTEXT

Current time: {datetime.now(timezone.utc).isoformat()}"""
    return system_prompt


def get_starting_agent(
    tool_list: Annotated[list[type[BaseTool]], Depends(filtered_tools)],
    system_prompt: Annotated[str, Depends(get_system_prompt)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Agent:
    """Get the starting agent."""
    agent = Agent(
        name="Agent",
        instructions=system_prompt,
        tools=tool_list,
        temperature=settings.llm.temperature,
    )
    return agent


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


async def get_context_variables(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
    thread: Annotated[Threads, Depends(get_thread)],
    s3_client: Annotated[Any, Depends(get_s3_client)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    openai_client: Annotated[AsyncOpenAI, Depends(get_openai_client)],
    python_sandbox: Annotated[WasmExecutor, Depends(get_python_sandbox)],
) -> dict[str, Any]:
    """Get the context variables to feed the tool's metadata."""
    # Get the current frontend url
    body = await request.json()
    current_frontend_url = body.get("frontend_url")
    # Get the url for entitycore links
    entity_frontend_url = settings.tools.frontend_base_url.rstrip("/") + "/app/entity"

    return {
        "bluenaas_url": settings.tools.bluenaas.url,
        "bucket_name": settings.storage.bucket_name,
        "entitycore_url": settings.tools.entitycore.url,
        "current_frontend_url": current_frontend_url,
        "entity_frontend_url": entity_frontend_url,
        "httpx_client": httpx_client,
        "obi_one_url": settings.tools.obi_one.url,
        "openai_client": openai_client,
        "project_id": thread.project_id,
        "python_sandbox": python_sandbox,
        "s3_client": s3_client,
        "sanity_url": settings.tools.sanity.url,
        "thread_id": thread.thread_id,
        "thumbnail_generation_url": settings.tools.thumbnail_generation.url,
        "usage_dict": {},
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
        "obi_one_url": settings.tools.obi_one.url.rstrip("/") + "/",
        "thumbnail_generation_url": settings.tools.thumbnail_generation.url.rstrip("/")
        + "/",
    }


def get_agents_routine(
    openrouter_client: Annotated[AsyncOpenAI | None, Depends(get_openrouter_client)],
    openai_client: Annotated[AsyncOpenAI | None, Depends(get_openai_client)],
) -> AgentsRoutine:
    """Get the AgentRoutine client."""
    if openrouter_client:
        return AgentsRoutine(openrouter_client)
    else:
        return AgentsRoutine(openai_client)


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
