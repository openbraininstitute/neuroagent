"""Task for circuit population analysis in Celery worker."""

import logging
import tarfile
import tempfile
from pathlib import Path

import bluepysnap
import duckdb
from httpx import Client
from openai import OpenAI
from pandas import DataFrame
from pydantic import BaseModel, Field

from neuroagent.task_schemas import (
    CircuitPopulationAnalysisTaskInput,
    CircuitPopulationAnalysisTaskOutput,
)
from neuroagent.tasks.main import celery, get_redis_client, get_settings
from neuroagent.tasks.utils import task_stream_notifier
from neuroagent.utils import get_token_count

logger = logging.getLogger(__name__)


class SQLStatement(BaseModel):
    """Output class for the structured output."""

    sql_statement: str = Field(
        description="SQL statement that must be executed to analyze the circuit population"
    )


def _download_and_extract_circuit(
    temp_dir: str,
    presigned_url: str,
) -> Path:
    """Download and extract circuit data from presigned URL, return path to config file."""
    client = Client(timeout=300.0, verify=False)
    try:
        # Download the .gz file
        logger.info("Downloading circuit.")
        Path(temp_dir).mkdir(parents=True, exist_ok=True)
        download_path = Path(temp_dir) / "circuit_data.gz"
        extract_dir = Path(temp_dir) / "extracted"
        Path(extract_dir).mkdir(parents=True, exist_ok=True)

        # Stream the presigned URL to disk to avoid large memory usage
        download_resp = client.get(presigned_url, headers={}, timeout=None)
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
    finally:
        client.close()


def _load_circuit_population_data(
    circuit_config_path: Path, population_name: str
) -> DataFrame:
    """Load circuit population data and return the neuron dataframe."""
    circuit = bluepysnap.Circuit(circuit_config_path)
    nodes = circuit.nodes.get()

    for node in nodes:
        if node[0] == population_name:
            return node[1]

    raise RuntimeError("Circuit population not found.")


def _is_safe_sql(sql: str) -> bool:
    """Check if SQL is safe (only SELECT queries)."""
    sql_upper = sql.upper().strip()
    dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", "EXEC"]
    return sql_upper.startswith("SELECT") and not any(
        word in sql_upper for word in dangerous
    )


def run_circuit_population_analysis(
    arg: CircuitPopulationAnalysisTaskInput,
) -> CircuitPopulationAnalysisTaskOutput:
    """Run circuit population analysis in the Celery worker.

    Parameters
    ----------
    arg : CircuitPopulationAnalysisTaskInput
        The input containing circuit_id, population_name, question, and auth info

    Returns
    -------
    CircuitPopulationAnalysisTaskOutput
        The analysis result containing result_data, query_executed, and token_consumption
    """
    try:
        settings = get_settings()
        if settings.llm is None or settings.llm.openai_token is None:
            raise ValueError(
                "OpenAI token is required for circuit population analysis. "
                "Please set TASKS__LLM__OPENAI_TOKEN environment variable."
            )
        openai_token = settings.llm.openai_token.get_secret_value()

        # Create sync clients
        openai_client = OpenAI(api_key=openai_token)

        with tempfile.TemporaryDirectory() as temp_dir:
            # Download and load the circuit population data
            circuit_config_path = _download_and_extract_circuit(
                temp_dir=temp_dir,
                presigned_url=arg.presigned_url,
            )
            population_dataframe = _load_circuit_population_data(
                circuit_config_path, arg.population_name
            )

            # Set up DuckDB connection
            conn = duckdb.connect()
            try:
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

Question about neurons: {arg.question}

Generate the SQL query to analyze the neuron population:"""

                # Get SQL from OpenAI
                model = "gpt-4o-mini"

                response = openai_client.beta.chat.completions.parse(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format=SQLStatement,
                )

                if response.choices[0].message.parsed:
                    sql = response.choices[0].message.parsed.sql_statement
                else:
                    raise ValueError("Couldn't generate SQL statement.")

                # Security check
                if not _is_safe_sql(sql):
                    raise ValueError("Generated SQL contains unsafe operations")

                # Execute query on neuron population
                result = conn.execute(sql).fetchdf()

                # Track token usage
                token_consumption_ = get_token_count(response.usage)
                token_consumption: dict[str, int | str | None] = {
                    **token_consumption_,
                    "model": model,
                }

                return CircuitPopulationAnalysisTaskOutput(
                    result_data=result.to_json(),
                    query_executed=sql,
                    token_consumption=token_consumption,
                )
            finally:
                conn.close()

    except Exception as e:
        logger.exception("Error executing circuit population analysis")
        raise Exception(f"Circuit population analysis failed: {str(e)}")


@celery.task(name="circuit_population_analysis_task", pydantic=True)
def run(arg: CircuitPopulationAnalysisTaskInput) -> CircuitPopulationAnalysisTaskOutput:
    """Celery task wrapper for circuit population analysis."""
    task_id = run.request.id
    redis_client = get_redis_client()

    # Context manager automatically handles stream notifications
    with task_stream_notifier(redis_client, task_id):
        return run_circuit_population_analysis(arg)
