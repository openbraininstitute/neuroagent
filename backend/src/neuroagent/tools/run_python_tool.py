"""Tool for running any kind of python code."""

import json
import logging
from typing import Any, ClassVar
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.app.database.sql_schemas import Messages
from neuroagent.executor import FailureOutput, SuccessOutput, WasmExecutor
from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import save_to_storage

logger = logging.getLogger(__name__)


class VariableReference(BaseModel):
    """
    Reference mechanism to extract values from previous tool outputs without copying data.

    This allows you to create variables that reference specific fields in tool outputs,
    avoiding the need to copy large data structures. The referenced value will be
    automatically extracted and made available as a variable.

    The JSONPath syntax is compatible with PostgreSQL JSONB path queries, allowing
    these references to work both in-memory and when querying JSONB columns.

    Example Usage:
    --------------
    If a previous tool call with ID '3f1ce684df8f4a7eaf9b5309de2d7244' returned:
    {
        "3f1ce684df8f4a7eaf9b5309de2d7244": {
            "soma_radius": 7.618,
            "soma_surface_area": 729.32,
            "dendrites": {
                "count": 5,
                "lengths": [10.2, 15.3, 8.7, 12.1, 9.5]
            }
        }
    }

    You can create references like:

    1. Extract surface area:
       VariableReference(
           variable_name='surface_area',
           tool_call_id='3f1ce684df8f4a7eaf9b5309de2d7244',
           jsonpath_reference='$.*.soma_surface_area'
       )
       → Creates variable: surface_area = 729.32
       → PostgreSQL: SELECT jsonb_path_query(column, '$.*.soma_surface_area')

    2. Extract dendrite count:
       VariableReference(
           variable_name='num_dendrites',
           tool_call_id='3f1ce684df8f4a7eaf9b5309de2d7244',
           jsonpath_reference='$.*.dendrites.count'
       )
       → Creates variable: num_dendrites = 5
       → PostgreSQL: SELECT jsonb_path_query(column, '$.*.dendrites.count')

    3. Extract all dendrite lengths:
       VariableReference(
           variable_name='dendrite_lengths',
           tool_call_id='3f1ce684df8f4a7eaf9b5309de2d7244',
           jsonpath_reference='$.*.dendrites.lengths[*]'
       )
       → Creates variable: dendrite_lengths = [10.2, 15.3, 8.7, 12.1, 9.5]
       → PostgreSQL: SELECT jsonb_path_query(column, '$.*.dendrites.lengths[*]')
    """

    variable_name: str = Field(
        description=(
            "Name of the variable to create. This is the identifier you'll use to "
            "access the extracted value in your script. Use valid Python variable names "
            "(alphanumeric and underscores, cannot start with a number).\n"
        ),
        examples=["surface_area", "result_data", "user_count", "neuron_data"],
    )

    tool_call_id: str = Field(
        description=(
            "ID of the tool call whose output you want to reference. "
            "This ID is ALWAYS the top-level key in the tool output JSON structure. "
            "Look for it at the root level of the previous tools' responses.\n\n"
            "Important: Copy the exact ID string from the tool output - it appears "
            "as the first key in the returned JSON object."
        ),
        examples=[
            "897d840de2d24a5795dbea539b8ff5e1",
            "f3b1b92ba207457abfe3bf84e17501c9",
        ],
        pattern=r"^[0-9a-fA-F]{32}$",
    )

    jsonpath_reference: str = Field(
        description=(
            "JSONPath query to extract the desired field from the tool output. "
            "Uses PostgreSQL-compatible JSONB path syntax for querying JSON data.\n\n"
            "CRITICAL SYNTAX RULES:\n"
            "- Always start with '$' (represents the root of the JSON)\n"
            "- Use '.*' tool_call_id level\n"
            "- Use '.<field>' to access object fields (e.g., '.soma_radius')\n"
            "- Use '[<index>]' for specific array elements (e.g., '[0]' for first)\n"
            "- Use '[*]' to get all array elements\n"
            "- Field names with special characters need quotes: '.\"field-name\"'\n\n"
            "Common Patterns:\n"
            "- Access top-level field: '$.*.field_name'\n"
            "  Example: '$.*.soma_surface_area'\n\n"
            "- Access nested field: '$.*.parent.child.field_name'\n"
            "  Example: '$.*.dendrites.count'\n\n"
            "- Access specific array element: '$.*.items[0]'\n"
            "  Example: '$.*.section_lengths[0]'\n\n"
            "- Access field in array element: '$.*.users[0].name'\n"
            "  Example: '$.*.measurements[0].value'\n\n"
            "- Get all array elements: '$.*.items[*]'\n"
            "  Example: '$.*.segment_radii[*]'\n\n"
            "- Access specific ID key: '$.*.field_name'\n"
            "  Example: '$.*.soma_radius'\n\n"
            "PostgreSQL JSONB Examples:\n"
            "Given JSONB column with structure:\n"
            "{'<uuid>': {'soma_radius': 7.618, 'soma_surface_area': 729.32, 'segment_radii': [1.2, 1.5, 1.8]} }\n\n"
            "- Get soma_radius: '$.*.soma_radius' → 7.618\n"
            "- Get soma_surface_area: '$.*.soma_surface_area' → 729.32\n"
            "- Get all segment_radii: '$.*.segment_radii[*]' → [1.2, 1.5, 1.8]\n"
            "- Get first segment radius: '$.*.segment_radii[0]' → 1.2\n\n"
            "Note: The wildcard '.*' matches any key at that level, which is perfect for\n"
            "skipping the UUID key when you don't know it in advance."
        ),
        examples=[
            "$.*.soma_surface_area",
            "$.*.soma_radius",
            "$.*.dendrites.count",
            "$.*.section_lengths[*]",
            "$.*.segment_radii[0]",
            "$.*.local_bifurcation_angles[*]",
            "$.*.soma_radius",
        ],
    )

    @field_validator("variable_name")
    @classmethod
    def validate_variable_name(cls, v: str) -> str:
        """Ensure variable name is a valid Python identifier."""
        if not v.isidentifier():
            raise ValueError(
                f"'{v}' is not a valid Python variable name. "
                "Use only letters, numbers, and underscores. "
                "Cannot start with a number."
            )
        return v

    @field_validator("jsonpath_reference")
    @classmethod
    def validate_jsonpath(cls, v: str) -> str:
        """Validate that JSONPath is compatible with PostgreSQL JSONB path queries."""
        if not v.startswith("$"):
            raise ValueError(
                f"JSONPath query must start with '$'. Did you mean: '${v}'?"
            )

        return v


class RunPythonInput(BaseModel):
    """Input schema for RunPython tool."""

    python_script: str = Field(
        description=(
            "Python code to execute. Write complete, runnable Python code.\n\n"
            "IMPORTANT: If you defined variables in the 'variables' field, they will be "
            "automatically available in your script's namespace - DO NOT redefine them. "
            "Simply use them as if they were already declared.\n\n"
            "Example with variables:\n"
            "If you define a variable named 'soma_radius' in the 'variables' field, "
            "your script can directly use it:\n"
            "  half_radius = soma_radius / 2\n"
            "  print(f'Half radius: {half_radius}')\n\n"
            "Best Practices:\n"
            "- Use variables from 'variables' field instead of hardcoding values\n"
            "- Include print statements to see output\n"
        )
    )
    variables: list[VariableReference] | None = Field(
        default=None,
        description=(
            "List of variable references that extract values from previous tool outputs. "
            "Use this to avoid copying large data structures into your python_script.\n\n"
            "HOW IT WORKS:\n"
            "1. Specify which previous tool output to reference (tool_call_id)\n"
            "2. Provide a JSONPath query to extract the specific field you need\n"
            "3. Give the variable a name to use in your python_script\n"
            "4. The variable will be automatically injected into your script's namespace with the name you gave it\n\n"
            "WHY USE THIS:\n"
            "- Avoids copying large JSON structures into the python_script field\n"
            "- Makes your code cleaner and more maintainable\n"
            "- Reduces token usage by referencing instead of copying data\n"
            "- Allows dynamic extraction from tool outputs\n\n"
            "COMPLETE EXAMPLE:\n"
            "Suppose a previous tool (ID: 'ec6bc4c482474705811c01ba72ae8eb6') returned:\n"
            "{\n"
            "  'ec6bc4c482474705811c01ba72ae8eb6': {\n"
            "    'soma_radius': 7.618,\n"
            "    'soma_surface_area': 729.32,\n"
            "    'segment_radii': [1.2, 1.5, 1.8, 2.1]\n"
            "  }\n"
            "}\n\n"
            "You can extract these values like this:\n"
            "{\n"
            "  'python_script': '''\n"
            "# Variables are already available - just use them!\n"
            "volume = (4/3) * 3.14159 * (soma_radius ** 3)\n"
            "surface_to_volume = soma_surface_area / volume\n"
            "print(f'Surface to volume ratio: {surface_to_volume:.2f}')\n\n"
            "# Work with array data\n"
            "import statistics\n"
            "avg_segment = statistics.mean(segment_radii)\n"
            "print(f'Average segment radius: {avg_segment:.2f}')\n"
            "''',\n"
            "  'variables': [\n"
            "    {\n"
            "      'variable_name': 'soma_radius',\n"
            "      'tool_call_id': 'ec6bc4c482474705811c01ba72ae8eb6',\n"
            "      'jsonpath_reference': '$.*.soma_radius'\n"
            "    },\n"
            "    {\n"
            "      'variable_name': 'soma_surface_area',\n"
            "      'tool_call_id': 'ec6bc4c482474705811c01ba72ae8eb6',\n"
            "      'jsonpath_reference': '$.*.soma_surface_area'\n"
            "    },\n"
            "    {\n"
            "      'variable_name': 'segment_radii',\n"
            "      'tool_call_id': 'ec6bc4c482474705811c01ba72ae8eb6',\n"
            "      'jsonpath_reference': '$.*.segment_radii'\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "IMPORTANT NOTES:\n"
            "- Variables are injected BEFORE your script runs - don't declare them again\n"
            "- Use the exact variable_name you specified in your script\n"
            "- You can reference the same tool_call_id multiple times with different paths\n"
            "- Array access: use '$.*.array_field[*]' for all elements, '$.*.array_field[0]' for first"
        ),
        examples=[
            [
                {
                    "variable_name": "soma_radius",
                    "tool_call_id": "7274a5f4d6554e91a95378fe37a33842",
                    "jsonpath_reference": "$.*.soma_radius",
                }
            ],
            [
                {
                    "variable_name": "surface_area",
                    "tool_call_id": "84f6db4263204287a58a23747a95c262",
                    "jsonpath_reference": "$.*.soma_surface_area",
                },
                {
                    "variable_name": "all_radii",
                    "tool_call_id": "abc3cf5d3e2d47c8ab72929a9aa957db",
                    "jsonpath_reference": "$.*.segment_radii[*]",
                },
            ],
        ],
    )


class RunPythonMetadata(BaseMetadata):
    """Metadata for RunPython tool."""

    python_sandbox: WasmExecutor
    s3_client: Any  # boto3 client
    user_id: UUID
    bucket_name: str
    thread_id: UUID
    session: AsyncSession


class RunPythonOutput(BaseModel):
    """Output class for the RunPython tool."""

    result: SuccessOutput | FailureOutput
    storage_id: list[str]


class RunPythonTool(BaseTool):
    """Tool that safely runs any python script."""

    name: ClassVar[str] = "run-python"
    name_frontend: ClassVar[str] = "Run Python"
    utterances: ClassVar[list[str]] = [
        "Compute the mean of the output.",
        "Compute the numerical value of the integral of the function between -10 and 10.",
        "Plot a Gaussian distribution with mean 0 and std 1.",
        "Plot its distribution.",
        "Plot functions.",
    ]
    description: ClassVar[
        str
    ] = """Tool to execute Python code and return stdout, stderr, and return value.
    The code may be async, and the value on the last line will be returned as the return value.
    The code will be executed with Python 3.12.
    AVAILABLE LIBRARIES:
    - Standard Python libraries (math, os, sys, json, datetime, etc.)
    - Numpy
    - Pandas
    - Plotly
    - Pydantic
    - Scikit-learn
    - Scipy

    # Tool's rules
    - The tool can be used to display plots through plotly.
    - Previous tool output's values MUST be passed using the `variables` field. Do not attempt to write them yourself inside of the `python_script`.
    - CRITICAL RULE: Whenever the user requests a plot, you MUST use this tool with the PLOTLY library.
    - If another available library offers plotting utilities, regenerate the plot in Plotly instead.
    - Figures defined in plotly will automatically be shown in the chat. Do not save them to disk.
    - Only the plotly library is able to plot in the chat.
    - The images can be downloaded directly in chat as plotly offers a download button next to the displayed image.
    - You are not able to export anything. Don't pretend like you can.
    - The user can read the code from this tool's input. DO NOT re-write the code you just executed in chat."""
    description_frontend: ClassVar[
        str
    ] = """Tool to execute Python code and return stdout, stderr, and return value.

The code may be async, and the value on the last line will be returned as the return value.

The code will be executed with Python 3.12.

The tool is able to plot through the Plotly library.

AVAILABLE LIBRARIES:
- Standard Python libraries (math, os, sys, json, datetime, etc.)
- Numpy
- Pandas
- Plotly
- Pydantic
- Scikit-Learn
- Scipy"""
    metadata: RunPythonMetadata
    input_schema: RunPythonInput

    async def arun(self) -> RunPythonOutput:
        """Run arbitrary python code."""
        # Perform variable resolution
        if self.input_schema.variables:
            select_columns = []
            for variable in self.input_schema.variables:
                # JSONB query for postgres
                # Strip [*] to get the container instead of individual elements
                path = variable.jsonpath_reference.rstrip("[*]")
                jsonpath_query = func.jsonb_path_query_first(
                    func.cast(Messages.content["content"], JSONB),
                    text(f"'{path}'::jsonpath"),
                )

                select_columns.append(jsonpath_query.label(variable.variable_name))

            # Single query that fetches all matching rows
            stmt = select(*select_columns).where(
                Messages.content["tool_call_id"].astext.in_(
                    [str(var.tool_call_id) for var in self.input_schema.variables]
                )
            )
            try:
                results = await self.metadata.session.execute(stmt)
                rows = results.first()
            except ProgrammingError:
                raise ValueError(
                    "Could not execute the variable retrieval query. Make sure the tool_call_id is correct, the JSONPath query is valid and points to an existing field."
                )

            # Raise an error if a variable could not be retrieved
            if rows is None or None in rows:
                raise ValueError(
                    f"Could not retrieve variables {','.join([k for k, v in rows._mapping.items() if v is None]) if rows else ''}. Please check that the jsonpath query is valid and that the tool_call_id is correct."
                )

            # Convert result to dictionary
            global_vars = dict(rows._mapping)
        else:
            global_vars = None

        # Run the entire code
        result = await self.metadata.python_sandbox.run_code(
            code=self.input_schema.python_script, globals=global_vars
        )

        identifiers = []
        # Check if we have images, upload them to the store if so
        # Get the plot stdout for parsing
        fig_list = []
        if result.status == "success":
            for i, elem in enumerate(result.output):
                # Stdout lines are not necessarily valid jsons
                try:
                    # Load every element of the stdout until we find our fig dict
                    output = json.loads(elem)

                    # Not only dicts can be valid json, gotta be careful
                    if isinstance(output, dict) and "_plots" in output:
                        fig_list = output["_plots"]
                        result.output.pop(i)  # Do not pollute stdout
                        break

                except json.JSONDecodeError:
                    continue

            # If we have figures, save them to the storage
            if fig_list:
                # Save individual jsons to storage
                for plot_json in fig_list:
                    identifiers.append(
                        save_to_storage(
                            s3_client=self.metadata.s3_client,
                            bucket_name=self.metadata.bucket_name,
                            user_id=self.metadata.user_id,
                            content_type="application/json",
                            body=plot_json,
                            category="json",
                            thread_id=self.metadata.thread_id,
                        )
                    )

        return RunPythonOutput(result=result, storage_id=identifiers)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if RunPython tool is accessible."""
        return True
