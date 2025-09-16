"""Tool to query pandas DataFrames using natural language."""

import os
import tarfile
import tempfile
from typing import ClassVar

import bluepysnap
import duckdb
from httpx import AsyncClient
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import get_token_count


class DataFrameQueryInput(BaseModel):
    """Inputs of the DataFrameQuery tool."""

    circuit_download_link: str = Field("Download link for the circuit")
    question: str = Field(
        description="Natural language question about the data in the circuit DataFrame"
    )


class DataFrameQueryMetadata(BaseMetadata):
    """Metadata of the DataFrameQuery tool."""

    openai_client: AsyncOpenAI
    httpx_client: AsyncClient
    token_consumption: dict[str, str | int | None] | None = None


class DataFrameQueryOutput(BaseModel):
    """Output of the DataFrameQuery tool."""

    result_data: str
    query_executed: str


class DataFrameQueryTool(BaseTool):
    """Class defining the DataFrameQuery tool."""

    name: ClassVar[str] = "dataframe-query"
    name_frontend: ClassVar[str] = "Query DataFrame"
    utterances: ClassVar[list[str]] = [
        "Query the data",
        "Analyze the DataFrame",
        "What does the data show",
        "Filter the data",
        "Show me data where",
    ]
    description: ClassVar[
        str
    ] = """This tool allows querying circuit DataFrames using natural language questions.

It converts natural language questions into SQL queries and executes them safely against the DataFrame data.
The tool supports filtering, aggregation, sorting, and statistical operations.

Input:
- circuit_download_link: URL to download the circuit data
- question: A natural language question about the data

Output: pandas DataFrame with the query results
"""

    description_frontend: ClassVar[str] = """Query your data using natural language.
Ask questions like "show me the top customers" or "what's the average by region" and get DataFrame results."""

    metadata: DataFrameQueryMetadata
    input_schema: DataFrameQueryInput

    async def _download_and_extract_circuit(self, temp_dir, download_url: str) -> str:
        """Download and extract circuit data, return path to config file."""
        # Download the .gz file
        print("DOWNLOADING FILE")
        response = await self.metadata.httpx_client.get(download_url, headers={})

        if response.status_code != 200:
            raise ValueError("DOUROUM")

        download_path = os.path.join(temp_dir, "circuit_data.gz")

        # Write the entire content at once
        with open(download_path, "wb") as f:
            f.write(response.content)

        # Extract the .gz file
        print("EXTRACTING FILE")
        extract_dir = os.path.join(temp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)

        with tarfile.open(download_path, "r:gz") as tar_ref:
            # Determine the root folder
            members = tar_ref.getnames()
            root_folder = members[0].split("/")[0] if members else None
            tar_ref.extractall(extract_dir)

        if root_folder:
            config_path = os.path.join(extract_dir, root_folder, "circuit_config.json")
        else:
            raise ValueError("no dir found")

        return config_path

    def _load_circuit_data(self, circuit_config_path: str):
        """Load circuit data and return the main dataframe."""
        circuit = bluepysnap.Circuit(circuit_config_path)
        nodes = circuit.nodes.get()
        dfs = []

        for node in nodes:
            print(node[0])
            dfs.append(node[1])

        # Return the third dataframe (index 2) as before
        # You might want to make this configurable or return all dataframes
        if len(dfs) > 2:
            return dfs[2]
        elif len(dfs) > 0:
            return dfs[0]  # Fallback to first dataframe
        else:
            raise ValueError("No dataframes found in circuit data")

    def _is_safe_sql(self, sql: str) -> bool:
        """Check if SQL is safe (only SELECT queries)."""
        sql_upper = sql.upper().strip()
        dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", "EXEC"]
        return sql_upper.startswith("SELECT") and not any(
            word in sql_upper for word in dangerous
        )

    async def arun(self) -> DataFrameQueryOutput:
        """Run the tool."""
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Download and load the circuit data
                circuit_config_path = await self._download_and_extract_circuit(
                    temp_dir, self.input_schema.circuit_download_link
                )
                dataframe = self._load_circuit_data(circuit_config_path)

                # Set up DuckDB connection
                conn = duckdb.connect()
                conn.register("data", dataframe)

                # Get schema info for the LLM
                columns = list(dataframe.columns)
                dtypes = {col: str(dtype) for col, dtype in dataframe.dtypes.items()}
                sample = (
                    dataframe.head().to_dict("records") if len(dataframe) > 0 else []
                )

                system_prompt = """You are an expert SQL generator. Generate only valid SQL SELECT queries.
    Rules:
    - Only SELECT statements allowed
    - Use table name 'data'
    - Return just the SQL query, no explanations
    - End with semicolon
    - Use proper SQL syntax for DuckDB"""

                user_prompt = f"""Convert this question to a SQL SELECT query.

    Table: 'data'
    Columns: {columns}
    Data types: {dtypes}
    Sample rows: {sample}

    Question: {self.input_schema.question}

    Generate the SQL query:"""

                # Get SQL from OpenAI
                model = "gpt-4o-mini"

                response = await self.metadata.openai_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )

                if response.choices[0].message.content:
                    sql = response.choices[0].message.content.strip()
                else:
                    raise ValueError("No content in chat completion.")

                # Clean up response (remove markdown if present)
                if "```" in sql:
                    parts = sql.split("```")
                    for part in parts:
                        if "SELECT" in part.upper():
                            sql = part.replace("sql", "").strip()
                            break

                # Security check
                if not self._is_safe_sql(sql):
                    raise ValueError("Generated SQL contains unsafe operations")

                # Execute query
                result = conn.execute(sql).fetchdf()

                # Track token usage
                token_consumption = get_token_count(response.usage)
                self.metadata.token_consumption = {**token_consumption, "model": model}

                return DataFrameQueryOutput(
                    result_data=result.to_json(), query_executed=sql
                )

        except Exception as e:
            raise Exception(f"Query failed: {str(e)}")
        finally:
            if "conn" in locals():
                conn.close()

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
