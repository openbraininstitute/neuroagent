"""Agent related CRUD operations."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from neuroagent.app.dependencies import (
    get_agents,
    get_user_info,
)
from neuroagent.app.schemas import (
    AgentMetadata,
    AgentMetadataDetailed,
    ToolMetadata,
    UserInfo,
)
from neuroagent.base_types import Agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Agent's CRUD"])


@router.get("")
def list_agents(
    agents: Annotated[dict[str, Agent], Depends(get_agents)],
    _: Annotated[UserInfo, Depends(get_user_info)],
    tool: str | None = None,
) -> dict[str, AgentMetadata]:
    """Return the list of available agents with tools and their basic metadata."""
    return {
        agent_name: AgentMetadata(
            name=agent.name,
            name_frontend=agent.name_frontend,
            description=agent.description,
        )
        for agent_name, agent in agents.items()
        if not tool or tool in [agent_tool.name for agent_tool in agent.tools]
    }


@router.get("/{agent_name}")
def get_agent(
    agents: Annotated[dict[str, Agent], Depends(get_agents)],
    _: Annotated[UserInfo, Depends(get_user_info)],
    agent_name: str,
) -> AgentMetadataDetailed:
    """Return detail over a single agent."""
    agent = agents[agent_name]
    return AgentMetadataDetailed(
        name=agent.name,
        name_frontend=agent.name_frontend,
        description=agent.description,
        tools=[
            ToolMetadata(name=tool.name, name_frontend=tool.name_frontend)
            for tool in agent.tools
        ],
    )
