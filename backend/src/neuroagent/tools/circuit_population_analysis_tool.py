"""Tool to analyze circuit population Frames using natural language queries."""

import logging
from typing import ClassVar
from uuid import UUID

from celery import Celery
from pydantic import BaseModel, Field
from redis import asyncio as aioredis

from neuroagent.task_schemas import (
    CircuitPopulationAnalysisTaskInput,
    CircuitPopulationAnalysisTaskOutput,
)
from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata
from neuroagent.utils import long_poll_celery_result

logger = logging.getLogger(__name__)


class CircuitPopulationAnalysisInput(BaseModel):
    """Inputs of the CircuitPopulationAnalysis tool."""

    circuit_id: UUID = Field(description="ID of the circuit.")
    population_name: str = Field(
        default="S1nonbarrel_neurons",
        description="Name of the circuit's population of interest.",
    )
    question: str = Field(
        description="Natural language question about the neurons in the circuit population. DO NOT mention the population name, it is already filtered by the `population_name` argument of this tool."
    )


class CircuitPopulationAnalysisMetadata(EntitycoreMetadata):
    """Metadata of the CircuitPopulationAnalysis tool."""

    celery_client: Celery
    redis_client: aioredis.Redis
    token_consumption: dict[str, str | int | None] | None = None


class CircuitPopulationAnalysisOutput(BaseModel):
    """Output of the CircuitPopulationAnalysis tool."""

    result_data: str
    query_executed: str


class CircuitPopulationAnalysisTool(BaseTool):
    """Class defining the CircuitPopulationAnalysis tool."""

    name: ClassVar[str] = "circuit-population-data-analysis"
    name_frontend: ClassVar[str] = "Analyze Circuit Population"
    utterances: ClassVar[list[str]] = [
        "What is the most common morphological type in the circuit?",
        "What is the number of excitatory neurons in layer 3?",
        "What is the distribution of cells per layer ",
        "How many me-type combinations and what are number of each me-type combinations used in circuit?",
        "Give me the unique e-types of the population S1nonbarrel_neurons.",
    ]
    description: ClassVar[
        str
    ] = """This tool allows analyzing SONATA neural circuit population data using natural language questions about neurons.

It converts natural language questions about neural circuit populations into SQL queries and executes them
against the population DataFrame. The tool supports comprehensive analysis of neuron populations following
the SONATA data format specification, including:

- Filtering neurons by spatial properties (3D coordinates, layer, region, subregion)
- Analyzing cell types (biophysical, point_neuron, single_compartment, virtual)
- Examining morphological properties (mtype, morphology files, model templates)
- Investigating electrical properties (etype, excitatory/inhibitory classification)
- Statistical analysis of population distributions and characteristics
- Spatial queries for neuron positioning and circuit topology

The tool understands SONATA-specific terminology and data structures, including node types, model types,
morphological classifications, and circuit organization principles.

Input:
- circuit_id: UUID of the circuit
- population_name: Name of the neural population to analyze, it will only keep this particular population.
- question: A natural language question about the neurons in the population, DO NOT MENTION the population name in the question.

Output: Analysis results showing neuron data based on the query, formatted according to SONATA standards
"""

    description_frontend: ClassVar[
        str
    ] = """Analyze SONATA neural circuit populations using natural language.
Ask questions like "What is the most common morphological type?", "How many excitatory neurons are in layer 5?", "Show me all biophysical neurons in visual cortex", or "What morphologies are used by inhibitory cells?" and get detailed circuit analysis."""
    metadata: CircuitPopulationAnalysisMetadata
    input_schema: CircuitPopulationAnalysisInput

    async def arun(self) -> CircuitPopulationAnalysisOutput:
        """Run the circuit population analysis tool via Celery task."""
        # Extract bearer token from httpx_client headers - hacky but whatever
        bearer_token = self.metadata.httpx_client.headers["authorization"].split(
            "Bearer "
        )[1]

        # Create task input with all required metadata
        task_input = CircuitPopulationAnalysisTaskInput(
            circuit_id=str(self.input_schema.circuit_id),
            population_name=self.input_schema.population_name,
            question=self.input_schema.question,
            vlab_id=str(self.metadata.vlab_id) if self.metadata.vlab_id else None,
            project_id=str(self.metadata.project_id)
            if self.metadata.project_id
            else None,
            bearer_token=bearer_token,
            entitycore_url=self.metadata.entitycore_url,
        )

        # Submit task to Celery
        celery_client = self.metadata.celery_client
        redis_client = self.metadata.redis_client
        task_result = celery_client.send_task(
            "circuit_population_analysis_task", args=[task_input.model_dump()]
        )
        logger.info(
            f"Submitted circuit_population_analysis_task with ID: {task_result.id}"
        )

        # Wait for result using Redis Streams (with longer timeout for circuit analysis)
        result_dict = await long_poll_celery_result(
            task_result, redis_client, timeout=300
        )
        logger.info(f"Task {task_result.id} completed")

        # Extract result from task output
        task_output = CircuitPopulationAnalysisTaskOutput(**result_dict)

        # Store token consumption in metadata
        if task_output.token_consumption:
            self.metadata.token_consumption = task_output.token_consumption

        # Return the result
        return CircuitPopulationAnalysisOutput(
            result_data=task_output.result_data,
            query_executed=task_output.query_executed,
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
