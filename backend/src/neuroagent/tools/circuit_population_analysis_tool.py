"""Tool to analyze circuit population Frames using natural language queries."""

import logging
import tarfile
import tempfile
from pathlib import Path
from typing import ClassVar
from uuid import UUID

import bluepysnap
import duckdb
from httpx import AsyncClient
from openai import AsyncOpenAI
from pandas import DataFrame
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseTool, EntitycoreMetadata
from neuroagent.utils import get_token_count

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

    openai_client: AsyncOpenAI
    httpx_client: AsyncClient
    token_consumption: dict[str, str | int | None] | None = None


class CircuitPopulationAnalysisOutput(BaseModel):
    """Output of the CircuitPopulationAnalysis tool."""

    result_data: str
    query_executed: str


class SQLStatement(BaseModel):
    """Output class for the structured output."""

    sql_statement: str = Field(
        description="SQL statement that must be executed to analyze the circuit population"
    )


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

    async def _download_and_extract_circuit(self, temp_dir: str) -> Path:
        """Download and extract circuit data, return path to config file."""
        # Find the `circuit.gz` sonata asset
        headers: dict[str, str] = {}
        if self.metadata.vlab_id is not None:
            headers["virtual-lab-id"] = str(self.metadata.vlab_id)
        if self.metadata.project_id is not None:
            headers["project-id"] = str(self.metadata.project_id)

        response = await self.metadata.httpx_client.get(
            url=self.metadata.entitycore_url.rstrip("/")
            + f"/circuit/{self.input_schema.circuit_id}",
            headers=headers,
        )
        if response.status_code != 200:
            raise ValueError(
                f"The circuit get one endpoint returned a non 200 response code. Error: {response.text}"
            )

        # Retrieve relevant asset's id
        assets = response.json()["assets"]
        circuit_gz_asset = next(
            (asset for asset in assets if asset["path"] == "circuit.gz"), None
        )
        if not circuit_gz_asset:
            raise ValueError(
                f"Circuit {self.input_schema.circuit_id} doesn't have a 'circuit.gz' file to download."
            )
        sonata_asset_id = circuit_gz_asset["id"]

        # Get pre-signed url
        response = await self.metadata.httpx_client.get(
            url=f"{self.metadata.entitycore_url.rstrip('/')}/circuit/{self.input_schema.circuit_id}/assets/{sonata_asset_id}/download",
            headers=headers,
            follow_redirects=False,
        )
        if response.status_code != 307:
            raise ValueError(
                f"The asset download endpoint returned a non 307 response code. Error: {response.text}"
            )
        presigned_url = response.headers["location"]

        # Download the .gz file
        logger.info("Downloading circuit.")
        Path(temp_dir).mkdir(parents=True, exist_ok=True)
        download_path = Path(temp_dir) / "circuit_data.gz"
        extract_dir = Path(temp_dir) / "extracted"
        Path(extract_dir).mkdir(parents=True, exist_ok=True)

        # Stream the presigned URL to disk to avoid large memory usage
        client = AsyncClient()
        download_resp = await client.get(presigned_url, headers={}, timeout=None)
        download_resp.raise_for_status()
        with open(download_path, "wb") as fw:
            fw.write(download_resp.content)

        # Extract the .gz file
        logger.info("Extracting file.")

        with tarfile.open(download_path, "r:gz") as tar_ref:
            # Determine the root folder
            members = tar_ref.getnames()
            root_folder = members[0].split("/")[0] if members else None
            tar_ref.extractall(extract_dir)  # nosec: B202

        if root_folder:
            config_path = Path(extract_dir) / root_folder / "circuit_config.json"
        else:
            raise ValueError("no dir found")

        return config_path

    def _load_circuit_population_data(self, circuit_config_path: Path) -> DataFrame:
        """Load circuit population data and return the neuron dataframe."""
        circuit = bluepysnap.Circuit(circuit_config_path)
        nodes = circuit.nodes.get()

        for node in nodes:
            if node[0] == self.input_schema.population_name:
                return node[1]

        raise RuntimeError("Circuit population not found.")

    @staticmethod
    def _is_safe_sql(sql: str) -> bool:
        """Check if SQL is safe (only SELECT queries)."""
        sql_upper = sql.upper().strip()
        dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", "EXEC"]
        return sql_upper.startswith("SELECT") and not any(
            word in sql_upper for word in dangerous
        )

    async def arun(self) -> CircuitPopulationAnalysisOutput:
        """Run the circuit population analysis tool."""
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Download and load the circuit population data
                circuit_config_path = await self._download_and_extract_circuit(temp_dir)
                population_dataframe = self._load_circuit_population_data(
                    circuit_config_path
                )
                # population_dataframe = self._load_circuit_population_data("../nbS1-HEX1/circuit_config.json")

                # Set up DuckDB connection
                conn = duckdb.connect()
                conn.register("neurons", population_dataframe)

                # Get schema info for the LLM
                columns = list(population_dataframe.columns)
                dtypes = {
                    col: str(dtype)
                    for col, dtype in population_dataframe.dtypes.items()
                }
                sample = (
                    population_dataframe.head().to_dict("records")
                    if len(population_dataframe) > 0
                    else []
                )
                system_prompt = """You are an expert SQL generator specializing in neural circuit analysis using the SONATA data format. Generate only valid SQL SELECT queries for analyzing neuron populations.

Rules:
- Only SELECT statements allowed
- Use table name 'neurons' (contains neuron data from circuit population)
- Return just the SQL query, no explanations
- End with semicolon
- Use proper SQL syntax for DuckDB
- Focus on neuron properties like types, regions, morphologies, and cellular characteristics

Example Query Patterns:
- Most common morphological type: SELECT mtype, COUNT(mtype) as freq FROM neurons GROUP BY mtype ORDER BY freq DESC LIMIT 1;
- Count excitatory neurons in layer 3: SELECT COUNT(*) FROM neurons WHERE synapse_class='EXC' AND layer=3;
- Unique morphologies count: SELECT COUNT(DISTINCT morphology) FROM neurons;
- Cell distribution by m-type: SELECT mtype, COUNT(*) as cell_count FROM neurons GROUP BY mtype;

SONATA Population Data Understanding:

The 'neurons' table represents a population of neurons from a neural circuit. Each row is a single neuron with the following structure:

Required Columns (Always Present):
- node_id (INTEGER): Unique identifier for each neuron within this population
- node_type_id (INTEGER): Links to node type definitions that specify shared properties
- model_type (VARCHAR): Type of neuron model, valid values:
  - 'biophysical' - Detailed compartmental neuron with morphology
  - 'point_neuron' - Simplified point process neuron
  - 'single_compartment' - Single compartment model
  - 'virtual' - External input source (not simulated)

Common Optional Columns:

Spatial Properties:
- x, y, z (FLOAT): 3D position coordinates of soma in micrometers
- orientation (VARCHAR): Quaternion string for morphology rotation
- rotation_angle_xaxis, rotation_angle_yaxis, rotation_angle_zaxis (FLOAT): Rotation angles in radians

Model Properties:
- morphology (VARCHAR): Name of morphology file (for biophysical neurons)
- model_template (VARCHAR): Template defining electrophysical properties (format: "schema:resource")
- model_processing (VARCHAR): Processing approach (e.g., 'fullaxon', 'axon_bbpv5')

Biological Properties:
- population (VARCHAR): Name of the population this neuron belongs to
- layer (VARCHAR): Cortical layer (e.g., 'L1', 'L2/3', 'L4', 'L5', 'L6')
- cell_type (VARCHAR): Cell type classification (e.g., 'PYR', 'INT', 'SST', 'PV')
- mtype (VARCHAR): Morphological type
- etype (VARCHAR): Electrical type
- region (VARCHAR): Brain region
- subregion (VARCHAR): Brain subregion

Additional Common Columns:
- ei (VARCHAR): Excitatory ('e') or Inhibitory ('i') classification
- synapse_class (VARCHAR): Synaptic class
- depth (FLOAT): Depth within cortical column
- tuning_angle (FLOAT): Orientation tuning preference
- dynamics_params (VARCHAR): JSON string of parameter overrides

Query Patterns for Neural Analysis:

Cell Type Analysis:
- Count neurons by model_type, cell_type, layer
- Filter excitatory vs inhibitory neurons
- Analyze morphological diversity

Spatial Analysis:
- Distance calculations using SQRT((x1-x2)^2 + (y1-y2)^2 + (z1-z2)^2)
- Neurons within spatial boundaries
- Layer-specific distributions

Circuit Composition:
- Population statistics by region/layer
- Cell type distributions
- Morphology usage patterns

Model Properties:
- Group by model_template or model_processing
- Filter biophysical vs point neurons
- Virtual neuron identification

Convert neuroscience questions about circuit populations to SQL queries that analyze neuron properties, spatial distributions, cell types, morphologies, and circuit composition using the SONATA data format understanding."""

                user_prompt = f"""Convert this neuroscience question about circuit population to a SQL SELECT query.

Table: 'neurons' (circuit population data)
Columns: {columns}
Types: {dtypes}
Sample neuron records: {sample}

Question about neurons: {self.input_schema.question}

Generate the SQL query to analyze the neuron population:"""

                # Get SQL from OpenAI
                model = "gpt-4o-mini"

                response = (
                    await self.metadata.openai_client.beta.chat.completions.parse(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format=SQLStatement,
                    )
                )

                if response.choices[0].message.parsed:
                    sql = response.choices[0].message.parsed.sql_statement
                else:
                    raise ValueError("Couldn't generate SQL statement.")

                # Security check
                if not self._is_safe_sql(sql):
                    raise ValueError("Generated SQL contains unsafe operations")

                # Execute query on neuron population
                result = conn.execute(sql).fetchdf()

                # Track token usage
                token_consumption = get_token_count(response.usage)
                self.metadata.token_consumption = {**token_consumption, "model": model}

                return CircuitPopulationAnalysisOutput(
                    result_data=result.to_json(), query_executed=sql
                )

        except Exception as e:
            raise Exception(f"Circuit population analysis failed: {str(e)}")
        finally:
            if "conn" in locals():
                conn.close()

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
