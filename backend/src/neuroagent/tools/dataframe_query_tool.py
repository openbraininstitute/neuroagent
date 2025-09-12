"""Tool to query pandas DataFrames using natural language."""

from typing import ClassVar

import bluepysnap
import duckdb
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import get_token_count


class DataFrameQueryInput(BaseModel):
    """Inputs of the DataFrameQuery tool."""

    # dataframe_name: str = Field(
    #     description="Name/identifier of the DataFrame to query"
    # )
    question: str = Field(
        description="Natural language question about the data in the DataFrame"
    )


class DataFrameQueryMetadata(BaseMetadata):
    """Metadata of the DataFrameQuery tool."""

    openai_client: AsyncOpenAI
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
    ] = """This tool allows querying pandas DataFrames using natural language questions.

It converts natural language questions into SQL queries and executes them safely against the DataFrame data.
The tool supports filtering, aggregation, sorting, and statistical operations.

Input:
- question: A natural language question about the data

Output: pandas DataFrame with the query results
"""
    # - dataframe_name: The name of the DataFrame to query

    description_frontend: ClassVar[str] = """Query your data using natural language.
Ask questions like "show me the top customers" or "what's the average by region" and get DataFrame results."""

    metadata: DataFrameQueryMetadata
    input_schema: DataFrameQueryInput

    def _is_safe_sql(self, sql: str) -> bool:
        """Check if SQL is safe (only SELECT queries)."""
        sql_upper = sql.upper().strip()
        dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", "EXEC"]
        return sql_upper.startswith("SELECT") and not any(
            word in sql_upper for word in dangerous
        )

    async def arun(self) -> DataFrameQueryOutput:
        """Run the tool."""
        # Load the circuit
        circuit_path = "../nbS1-O1-vSub-nCN-HEX0-L1-01/circuit_config.json"
        circuit = bluepysnap.Circuit(circuit_path)
        nodes = circuit.nodes.get()
        dfs = []

        for node in nodes:
            dfs.append(node[1])

        dataframe = dfs[2]

        # Set up DuckDB connection
        conn = duckdb.connect()
        conn.register("data", dataframe)

        try:
            # Get schema info for the LLM
            columns = list(dataframe.columns)
            dtypes = {col: str(dtype) for col, dtype in dataframe.dtypes.items()}
            sample = dataframe.head(2).to_dict("records") if len(dataframe) > 0 else []

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
            conn.close()

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True
