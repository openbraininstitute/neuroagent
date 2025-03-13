"""App dependencies."""

import logging
from collections import defaultdict
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
from neuroagent.base_types import Agent, AgentsNames, BaseTool
from neuroagent.tools import (
    ElectrophysFeatureTool,
    GetMorphoTool,
    GetTracesTool,
    HandoffToExploreTool,
    HandoffToLiteratureTool,
    HandoffToSimulationTool,
    HandoffToTriageTool,
    HandoffToUtilityTool,
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
        HandoffToExploreTool,
        HandoffToLiteratureTool,
        HandoffToSimulationTool,
        HandoffToTriageTool,
        HandoffToUtilityTool,
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


def get_agents(
    settings: Annotated[Settings, Depends(get_settings)],
    selected_tools: Annotated[list[type[BaseTool]], Depends(get_selected_tools)],
) -> dict[str, Agent]:
    """Get a dictionary of agents."""
    storage_instructions = (
        f"All files in storage can be viewed under {settings.misc.frontend_url}/viewer/{{storage_id}}. "
        "When referencing storage files, always replace {{storage_id}} with the actual storage ID. "
        "Format the links as standard markdown links like: [Description](URL), do not try to embed them as images."
        if settings.misc.frontend_url
        else "Never try to generate links to internal storage ids"
    )

    # Simple agent
    if settings.agent.composition == "simple":
        base_instructions = """You are a helpful assistant helping scientists with neuro-scientific questions.
                You must always specify in your answers from which brain regions the information is extracted.
                Do no blindly repeat the brain region requested by the user, use the output of the tools instead."""

        single_agent = Agent(
            name="Agent",
            name_frontend="Agent",
            description="A multi-task agent.",
            instructions=f"{base_instructions}\n{storage_instructions}",
            tools=[tool for tool in selected_tools if "handoff-to" not in tool.name],
            model=settings.openai.model,
        )
        return {"Agent": single_agent}

    # Multi agent
    agent_tool_mapping = defaultdict(list)

    # Dispatch tools into their respective agent
    for tool in selected_tools:
        for agent in tool.agents:
            agent_tool_mapping[agent].append(tool)

    # Triage agent
    base_instructions_triage = """You are a helpful assistant helping scientists with neuro-scientific questions.
    Determine which agent is best suited to handle the user's request, and transfer the conversation to that agent.
    Other agents have the capability of handing off back to you. Therefore if a request requires multiple agents,
    handoff to the first one, wait for him to handoff back to you, handoff to the second one etc...
    You are the only agent allowed to talk and finish the chain of action. if you decide that either all of the actions are excuted or that you cannot proceed further, summarize the findings to the user."""
    triage_agent = Agent(
        name=AgentsNames.TRIAGE_AGENT.value,
        name_frontend="Triage Agent",
        description="The mastermind of the operations. The triage agent is responsible for routing the workflow to the sub-agents.",
        instructions=f"{base_instructions_triage}\n{storage_instructions}",
        tools=agent_tool_mapping[AgentsNames.TRIAGE_AGENT.value],
        model=settings.openai.model,
        parallel_tool_calls=False,
    )

    # Literature agent
    base_instructions_literature = """You are the literature agent helping scientists to find neuro-science related papers in the literature.
    As soon as you are in control of the conversation, execute the pending tasks that you can solve with your tools.
    Handoff back to the triage agent ONLY WHEN YOU ARE DONE EXECUTING OTHER RELEVANT TOOLS.
    Your task is to solve the literature related queries. As soon as the user asks for scientific information (with keywords such as find papers, show me articles etc...), use your tools to fulfill the request."""
    literature_agent = Agent(
        name=AgentsNames.LITERATURE_AGENT.value,
        name_frontend="Literature Agent",
        description="The Literature Agent is your scientific buddy expert in technical papers. He is your guy when it comes to finding any type of information burried somewhere in the depth of a scientific journal.",
        instructions=base_instructions_literature,
        tools=agent_tool_mapping[AgentsNames.LITERATURE_AGENT.value],
        model=settings.openai.model,
    )

    # Explore agent
    base_instructions_explore = """You are the explore agent which has tools connected to a neuro-science platform called the Open Brain Platform.
    As soon as you are in control of the conversation, execute the pending tasks that you can solve with your tools.
    Handoff back to the triage agent ONLY WHEN YOU ARE DONE EXECUTING OTHER RELEVANT TOOLS.
    You must ALWAYS specify in your answers from which brain regions the information is extracted.
    Do no blindly repeat the brain region requested by the user, use the output of the tools instead."""

    explore_agent = Agent(
        name=AgentsNames.EXPLORE_AGENT.value,
        name_frontend="Explore Agent",
        description="The Explore Agent is the master of the Explore section from the Open Brain Platform. Aware of the data, he will guide you and help you dig the morphology you have always dreamed of.",
        instructions=base_instructions_explore,
        tools=agent_tool_mapping[AgentsNames.EXPLORE_AGENT.value],
        model=settings.openai.model,
    )

    # Simulation agent
    base_instructions_simulation = """You are the simulation agent which has tools connected to a neuro-science platform called the Open Brain Platform.
    As soon as you are in control of the conversation, execute the pending tasks that you can solve with your tools.
    Handoff back to the triage agent ONLY WHEN YOU ARE DONE EXECUTING OTHER RELEVANT TOOLS.
    You must ALWAYS specify in your answers from which brain regions the information is extracted.
    Do no blindly repeat the brain region requested by the user, use the output of the tools instead."""
    simulation_agent = Agent(
        name=AgentsNames.SIMULATION_AGENT.value,
        name_frontend="Simulation Agent",
        description="The Simulation Agent is the master of the Simulate section from the Open Brain Platform. Expert in all scale simulations, he will help you plan and configure them to ensure reaching their desired behavior at the speed of thoughts.",
        instructions=base_instructions_simulation,
        tools=agent_tool_mapping[AgentsNames.SIMULATION_AGENT.value],
        model=settings.openai.model,
    )

    # Utility agent
    base_instructions_utility = """You are the utility agent with general purpose tools.
    As soon as you are in control of the conversation, execute the pending tasks that you can solve with your tools.
    Handoff back to the triage agent ONLY WHEN YOU ARE DONE EXECUTING OTHER RELEVANT TOOLS."""
    utility_agent = Agent(
        name=AgentsNames.UTILITY_AGENT.value,
        name_frontend="Utility Agent",
        description="The Utility Agent is your beloved Swiss Knife Army agent. Equiped with generic tools for data fetching, transformation and display, he will be your to-go agent when inspiration is missing.",
        instructions=base_instructions_utility,
        tools=agent_tool_mapping[AgentsNames.UTILITY_AGENT.value],
        model=settings.openai.model,
    )
    agent_dict = {
        AgentsNames.TRIAGE_AGENT.value: triage_agent,
        AgentsNames.LITERATURE_AGENT.value: literature_agent,
        AgentsNames.EXPLORE_AGENT.value: explore_agent,
        AgentsNames.SIMULATION_AGENT.value: simulation_agent,
        AgentsNames.UTILITY_AGENT.value: utility_agent,
    }

    # Every agent is forced to call tool calls except for the starting agent.
    for agent_object in agent_dict.values():
        agent_object.tool_choice = (
            "auto" if agent_object.name == settings.agent.starting_agent else "required"
        )

    return agent_dict


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
    return boto3.client(
        "s3",
        endpoint_url=settings.storage.endpoint_url,
        aws_access_key_id=settings.storage.access_key.get_secret_value(),
        aws_secret_access_key=settings.storage.secret_key.get_secret_value(),
        aws_session_token=None,
        config=boto3.session.Config(signature_version="s3v4"),
    )


def get_context_variables(
    settings: Annotated[Settings, Depends(get_settings)],
    agents: Annotated[dict[str, Agent], Depends(get_agents)],
    token: Annotated[str, Depends(auth)],
    httpx_client: Annotated[AsyncClient, Depends(get_httpx_client)],
    thread: Annotated[Threads, Depends(get_thread)],
    s3_client: Annotated[Any, Depends(get_s3_client)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
) -> dict[str, Any]:
    """Get the context variables to feed the tool's metadata."""
    return {
        **agents,
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
