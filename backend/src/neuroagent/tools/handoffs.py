"""Handoff tools."""

from typing import ClassVar

from pydantic import BaseModel

from neuroagent.base_types import Agent, AgentsNames, BaseMetadata, BaseTool


class HandoffInputs(BaseModel):
    """inputs of the handoff tools."""

    pass


class HandoffToTriageMetadata(BaseMetadata):
    """Metadata of the handoff to utility agent tools."""

    triage_agent: Agent


class HandoffToTriageTool(BaseTool):
    """Handoff tool to the Triage agent."""

    name: ClassVar[str] = "handoff-to-triage-agent"
    name_frontend: ClassVar[str] = "To Triage Agent"
    description: ClassVar[str] = """Handoff back to the triage agent.
    Return to the triage agent if you are not able to handle the user's request.
    """
    description_frontend: ClassVar[str] = "Handoff to the Triage Agent."
    agents: ClassVar[list[str]] = [
        AgentsNames.EXPLORE_AGENT.value,
        AgentsNames.SIMULATION_AGENT.value,
        AgentsNames.UTILITY_AGENT.value,
        AgentsNames.LITERATURE_AGENT.value,
    ]
    metadata: HandoffToTriageMetadata
    input_schema: HandoffInputs

    async def arun(self) -> Agent:
        """Run the tool."""
        return self.metadata.triage_agent

    @classmethod
    async def is_online(cls) -> bool:
        """Check if tool is online."""
        return True


class HandoffToExploreMetadata(BaseMetadata):
    """Metadata of the handoff to explore agent tools."""

    explore_agent: Agent


class HandoffToExploreTool(BaseTool):
    """Handoff tool to the Explore agent."""

    name: ClassVar[str] = "handoff-to-explore-agent"
    name_frontend: ClassVar[str] = "To Explore Agent"
    description: ClassVar[str] = """Handoff to the explore agent.
    The explore agent is capable of handling requests about neuron morphologies and electrophysiology.
    He has access to the Open Brain Platorm explore section, a section that contains a lot of morphology and trace data.
    Do not handoff to this agent for literature related questions."""
    description_frontend: ClassVar[str] = "Handoff to the Explore Agent."
    agents: ClassVar[list[str]] = [AgentsNames.TRIAGE_AGENT.value]
    metadata: HandoffToExploreMetadata
    input_schema: HandoffInputs

    async def arun(self) -> Agent:
        """Run the tool."""
        return self.metadata.explore_agent

    @classmethod
    async def is_online(cls) -> bool:
        """Check if tool is online."""
        return True


class HandoffToSimulationMetadata(BaseMetadata):
    """Metadata of the handoff to simulation agent tools."""

    simulation_agent: Agent


class HandoffToSimulationTool(BaseTool):
    """Handoff tool to the Simulation agent."""

    name: ClassVar[str] = "handoff-to-simulation-agent"
    name_frontend: ClassVar[str] = "To Simulation Agent"
    description: ClassVar[str] = """Handoff to the simulation agent.
    The simulation agent is capable of getting models for simulations such as ME models, as well as starting amd listing simulations.
    Do not handoff to this agent for literature related questions."""
    description_frontend: ClassVar[str] = "Handoff to the Simulation Agent."
    agents: ClassVar[list[str]] = [AgentsNames.TRIAGE_AGENT.value]
    metadata: HandoffToSimulationMetadata
    input_schema: HandoffInputs

    async def arun(self) -> Agent:
        """Run the tool."""
        return self.metadata.simulation_agent

    @classmethod
    async def is_online(cls) -> bool:
        """Check if tool is online."""
        return True


class HandoffToLiteratureMetadata(BaseMetadata):
    """Metadata of the handoff to literature agent tools."""

    literature_agent: Agent


class HandoffToLiteratureTool(BaseTool):
    """Handoff tool to the Simulation agent."""

    name: ClassVar[str] = "handoff-to-literature-agent"
    name_frontend: ClassVar[str] = "To Literature Agent"
    description: ClassVar[str] = """Handoff to the literature agent.
    The literature agent is capable of gathering scientific information from articles in a knowledge base.
    This tool should be used only when the user requires scientific information.
    """
    description_frontend: ClassVar[str] = "Handoff to the Literature Agent."
    agents: ClassVar[list[str]] = [AgentsNames.TRIAGE_AGENT.value]
    metadata: HandoffToLiteratureMetadata
    input_schema: HandoffInputs

    async def arun(self) -> Agent:
        """Run the tool."""
        return self.metadata.literature_agent

    @classmethod
    async def is_online(cls) -> bool:
        """Check if tool is online."""
        return True


class HandoffToUtilityMetadata(BaseMetadata):
    """Metadata of the handoff to utility agent tools."""

    utility_agent: Agent


class HandoffToUtilityTool(BaseTool):
    """Handoff tool to the Utility agent."""

    name: ClassVar[str] = "handoff-to-utility-agent"
    name_frontend: ClassVar[str] = "To Utility Agent"
    description: ClassVar[str] = """Handoff to the utility agent.
    The utility agent contains generic tools such as plotting and web search.
    The web search is to be used only for generic, non-literature related searches.
    """
    description_frontend: ClassVar[str] = "Handoff to the Utility Agent."
    agents: ClassVar[list[str]] = [AgentsNames.TRIAGE_AGENT.value]
    metadata: HandoffToUtilityMetadata
    input_schema: HandoffInputs

    async def arun(self) -> Agent:
        """Run the tool."""
        return self.metadata.utility_agent

    @classmethod
    async def is_online(cls) -> bool:
        """Check if tool is online."""
        return True
