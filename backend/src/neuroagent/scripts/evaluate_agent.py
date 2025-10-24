"""Evaluate agent responses and tool calling capabilities."""

import argparse
import asyncio
import fnmatch
import inspect
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

import httpx
import pandas as pd
from deepeval.evaluate import evaluate
from deepeval.metrics import GEval, ToolCorrectnessMetric
from deepeval.test_case import LLMTestCase, LLMTestCaseParams, ToolCall, ToolCallParams
from dotenv import load_dotenv
from pydantic import BaseModel, Field

import neuroagent.tools
from neuroagent.tools.base_tool import BaseTool

# Default evaluation directory relative to this script
DEFAULT_EVAL_DIR = Path(__file__).parent.parent.parent.parent / "eval"

logging.basicConfig(
    format="[%(levelname)s]  %(asctime)s %(name)s  %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# NOTE: For now the MCP tools are not included.
all_classes = inspect.getmembers(neuroagent.tools, inspect.isclass)
tool_list: list[type[BaseTool]] = [cls for _, cls in all_classes]


# Pydantic models for JSON validation
class TestCaseParams(BaseModel):
    """Model for params.json files."""

    tags: list[str] = Field(default_factory=list)


class ToolCallModel(BaseModel):
    """Model for individual tool call."""

    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolCalls(BaseModel):
    """Model for tool calls (both expected and actual)."""

    tool_calls: list[ToolCallModel] = Field(default_factory=list)

    @classmethod
    def from_list(cls, tool_calls_list: list[dict[str, Any]]) -> "ToolCalls":
        """Create from list of tool call dictionaries."""
        return cls(tool_calls=[ToolCallModel(**tc) for tc in tool_calls_list])


class MetricResult(BaseModel):
    """Model for individual metric result."""

    name: str
    score: float
    success: bool
    threshold: float
    reason: str


class EvaluationResults(BaseModel):
    """Model for results.json files."""

    metrics: list[MetricResult] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)


class OverallResults(BaseModel):
    """Model for overall_results.json files."""

    total_tests: int = 0
    metrics_df: list[dict[str, Any]] = Field(
        default_factory=list
    )  # pandas DataFrame as list of records
    created_at: datetime = Field(default_factory=datetime.now)


def get_parser() -> argparse.ArgumentParser:
    """Get parser for command line arguments."""
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "token",
        type=str,
        help="Bearer token for the neuroagent-api call.",
    )
    parser.add_argument(
        "--agent-url",
        "-u",
        required=False,
        default="http://localhost:8000",
        help="URL of the neuroagent api.",
    )
    parser.add_argument(
        "--eval-dir",
        "-d",
        type=Path,
        default=DEFAULT_EVAL_DIR,
        help="Path to the evaluation directory containing input/ and output/ folders.",
    )
    parser.add_argument(
        "--concurrent-requests",
        "-c",
        type=int,
        default=5,
        help="Number of async requests sent concurrently.",
    )
    parser.add_argument(
        "--timeout",
        "-t",
        type=float,
        default=60.0,
        help="Timeout in seconds for HTTP requests.",
    )
    parser.add_argument(
        "-k",
        "--keyword",
        type=str,
        default=None,
        help="Filter test cases by name pattern (supports pytest-style patterns with OR logic). Example: 'cerebellum or morphology'",
    )
    return parser


def parse_ai_sdk_streaming_response(streamed_data: str) -> dict[str, Any]:
    """
    Parse a Vercel AI SDK-compatible streamed response string and turns it into structured data.

    Parameters
    ----------
    streamed_data
        String representing the raw output of the `chat_streamed` endpoint.

    Returns
    -------
        {
            "response": "Final assistant output",
            "tool_calls": [
                {
                    "name": str,
                    "arguments": dict[str, Any]
                },
                ...
            ]
        }
    """
    response_tokens = []
    tool_args_buffer: dict[str, str] = {}  # toolCallId -> args string
    tool_calls = {}

    for line in streamed_data.splitlines():
        prefix, _, data = line.partition(":")
        try:
            content = json.loads(data)
        except json.JSONDecodeError:
            continue

        # Streamed response text
        if prefix == "0":
            token = data.strip('"')
            response_tokens.append(token)

        # Final tool call object (can override partials)
        elif prefix == "9":
            tool_call_id = content.get("toolCallId")
            tool_calls[tool_call_id] = {
                "name": content.get("toolName"),
                "arguments": content.get("args", {}),
            }

    # Final pass: fill in any tool calls using streamed args
    for tool_call_id, args_str in tool_args_buffer.items():
        if tool_call_id not in tool_calls:
            tool_calls[tool_call_id] = {"name": None, "arguments": {}}
        try:
            tool_calls[tool_call_id]["arguments"] = json.loads(args_str)
        except json.JSONDecodeError:
            tool_calls[tool_call_id]["arguments"] = {}

    final_output = "".join(response_tokens).strip()

    return {"response": final_output, "tool_calls": list(tool_calls.values())}


def filter_test_cases_by_pattern(
    test_cases: list[dict[str, Any]], pattern: str
) -> list[dict[str, Any]]:
    """
    Filter test cases based on pytest-style pattern matching.

    This function supports various pattern matching strategies similar to pytest's
    `-k` flag, allowing for flexible test case selection based on test names.

    Parameters
    ----------
    test_cases : list[dict[str, Any]]
        List of test case dictionaries containing test information.
    pattern : str
        Pattern string to match against test names. Supports:

        - Simple substring matching: 'cerebellum'
        - OR patterns: 'cerebellum or morphology'
        - AND patterns: 'cerebellum and morphology'
        - Wildcard patterns: 'cerebellum*' or '*morphology'

        Pattern matching is case-insensitive.

    Returns
    -------
    list[dict[str, Any]]
        Filtered list of test cases that match the given pattern.
        Returns all test cases if pattern is None or empty.

    Examples
    --------
    >>> test_cases = [
    ...     {'name': 'cerebellum_morphologies'},
    ...     {'name': 'matplotlib_plot'},
    ...     {'name': 'morphology_studies'}
    ... ]
    >>> filter_test_cases_by_pattern(test_cases, 'cerebellum or plot')
    [{'name': 'cerebellum_morphologies'}, {'name': 'matplotlib_plot'}]

    >>> filter_test_cases_by_pattern(test_cases, 'morphology*')
    [{'name': 'cerebellum_morphologies'}, {'name': 'morphology_studies'}]
    """
    if not pattern:
        return test_cases

    # Split pattern by 'or' (case insensitive) for OR logic
    or_patterns = [
        p.strip() for p in re.split(r"\s+or\s+", pattern, flags=re.IGNORECASE)
    ]

    filtered_cases = []

    for test_case in test_cases:
        test_name = test_case["name"]

        # Check if any OR pattern matches
        for or_pattern in or_patterns:
            # Handle AND logic within each OR pattern
            and_patterns = [
                p.strip()
                for p in re.split(r"\s+and\s+", or_pattern, flags=re.IGNORECASE)
            ]

            # All AND patterns must match for this OR pattern to be valid
            and_matches = []
            for and_pattern in and_patterns:
                # Use fnmatch for wildcard support
                if fnmatch.fnmatch(test_name.lower(), and_pattern.lower()):
                    and_matches.append(True)
                elif and_pattern.lower() in test_name.lower():
                    and_matches.append(True)
                else:
                    and_matches.append(False)

            # If all AND patterns match, this OR pattern is valid
            if all(and_matches):
                filtered_cases.append(test_case)
                break  # Don't add the same test case multiple times

    return filtered_cases


def load_test_cases(
    eval_dir: Path, filter_pattern: str | None = None
) -> list[dict[str, Any]]:
    """Load test cases from the input/ folder structure."""
    input_dir = eval_dir / "input"
    test_cases = []

    for test_case_dir in input_dir.iterdir():
        if not test_case_dir.is_dir():
            continue

        # Load test case data directly from test_case_dir (no nested input/ folder)
        try:
            with open(test_case_dir / "user.md", "r") as f:
                input_text = f.read()

            with open(test_case_dir / "expected_output.md", "r") as f:
                expected_output = f.read()

            # Load and validate expected tool calls
            with open(test_case_dir / "expected_tool_calls.json", "r") as f:
                expected_tool_calls_data = json.load(f)

            # Load and validate params
            with open(test_case_dir / "params.json", "r") as f:
                params_data = json.load(f)
            params = TestCaseParams(**params_data)

            test_cases.append(
                {
                    "name": test_case_dir.name,
                    "input": input_text,
                    "expected_output": expected_output,
                    "expected_tool_calls": expected_tool_calls_data,  # Keep as list for compatibility
                    "params": params,
                    "test_case_dir": test_case_dir,
                }
            )

        except Exception as e:
            logger.error(f"Error loading test case {test_case_dir.name}: {e}")
            continue

    # Apply filtering if pattern is provided
    if filter_pattern:
        test_cases = filter_test_cases_by_pattern(test_cases, filter_pattern)
        logger.info(
            f"Filtered to {len(test_cases)} test cases matching pattern: {filter_pattern}"
        )

    return test_cases


def collect_test_case_results(
    test_case: dict[str, Any],
    decoded_response: dict[str, Any],
    evaluation_results: dict[str, Any],
) -> dict[str, Any]:
    """Collect test case results for consolidation into detailed.json."""
    # Prepare actual tool calls with validation
    actual_tool_calls = ToolCalls.from_list(decoded_response.get("tool_calls", []))

    # Prepare evaluation results with validation and timestamp
    eval_results = EvaluationResults(**evaluation_results)

    return {
        # Input data
        "user": test_case["input"],
        "expected_output": test_case["expected_output"],
        "expected_tool_calls": test_case["expected_tool_calls"],
        "params": test_case["params"].model_dump(),
        # Output data
        "ai_response": decoded_response["response"],
        "actual_tool_calls": actual_tool_calls.model_dump(),
        "results": eval_results.model_dump(),
    }


def compute_overall_results(detailed_results: dict[str, Any]) -> OverallResults:
    """Compute overall results from detailed results data."""
    overall_results = OverallResults()

    # Collect all data for DataFrame creation
    test_case_data = []
    metric_names = set()

    for test_name, test_data in detailed_results.items():
        overall_results.total_tests += 1

        # Extract metrics for this test case
        metrics = test_data.get("results", {}).get("metrics", [])
        test_case_row = {"test_name": test_name}

        for metric in metrics:
            metric_name = metric.get("name", "Unknown")
            score = metric.get("score", 0)
            test_case_row[metric_name] = score
            metric_names.add(metric_name)

        test_case_data.append(test_case_row)

    # Create DataFrame
    if test_case_data:
        df = pd.DataFrame(test_case_data)
        # Fill NaN values with 0 for missing metrics
        df = df.fillna(0)
        # Sort by test_name for consistency
        df = df.sort_values("test_name").reset_index(drop=True)

        # Convert DataFrame to dict for JSON serialization
        overall_results.metrics_df = df.to_dict("records")
    else:
        overall_results.metrics_df = []

    return overall_results


async def eval_sample(
    test_case: dict[str, Any],
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    url: str = "http://localhost:8000",
) -> LLMTestCase:
    """Run a single test case against our API."""
    logger.info(f"Running test case: {test_case['name']}")
    async with semaphore:
        # Create a thread to work with
        response = await client.post(f"{url}/threads")
        if response.status_code == 200:
            thread_id = response.json()["thread_id"]
        else:
            raise RuntimeError(f"Failed to create a thread. Reason: {response.text}")
        try:
            # Send the request to chat_streamed using the previously created thread
            response = await client.post(
                f"{url}/qa/chat_streamed/{thread_id}",
                json={"content": test_case["input"]},
            )
            # Delete the original thread
        finally:
            await client.delete(f"http://localhost:8000/threads/{thread_id}")

    # "unvercel" the response
    decoded = parse_ai_sdk_streaming_response(response.text)

    # Remove default arguments from streamed tool calls,
    # i.e. we evaluate only the non-default args the LLM gave
    if "tool_calls" in decoded:
        for i, tool_call in enumerate(decoded["tool_calls"]):
            try:
                tool_class = next(
                    tool for tool in tool_list if tool.name == tool_call["name"]
                )
            except StopIteration:
                logger.warning(
                    f"Tool '{tool_call['name']}' not found in available tools."
                )
                # Keep the original tool call with all arguments intact
                continue
            input_class = tool_class.__annotations__["input_schema"](
                **tool_call["arguments"]
            )
            decoded["tool_calls"][i]["arguments"] = input_class.model_dump(
                exclude_defaults=True,
                mode="json",
            )

    tools_called = [
        ToolCall(name=tool["name"], input_parameters=tool["arguments"])
        for tool in decoded.get("tool_calls", [])
    ]
    expected_tool_calls = [
        ToolCall(name=tool["name"], input_parameters=tool["arguments"])
        for tool in test_case["expected_tool_calls"]
    ]
    test_case_obj = LLMTestCase(
        name=test_case["name"],
        input=test_case["input"],
        actual_output=decoded["response"],
        expected_output=test_case["expected_output"],
        tools_called=tools_called,
        expected_tools=expected_tool_calls,
        additional_metadata={
            "actual_tool_calls": decoded.get("tool_calls", []),
        },
    )

    return test_case_obj


async def run_eval(
    token: str,
    eval_dir: Path = DEFAULT_EVAL_DIR,
    agent_url: str = "http://localhost:8000",
    concurrent_requests: int = 5,
    timeout: float = 60.0,
    keyword: str | None = None,
) -> None:
    """Run the evaluation on the test cases."""
    # Load test cases from folder structure
    test_cases = load_test_cases(eval_dir, keyword)
    logger.info(f"Loaded {len(test_cases)} test cases")

    client = httpx.AsyncClient(
        timeout=timeout, headers={"Authorization": f"Bearer {token}"}
    )
    semaphore = asyncio.Semaphore(concurrent_requests)

    # Run evaluations in parallel
    tasks = [
        asyncio.create_task(
            eval_sample(
                test_case=test_case, client=client, semaphore=semaphore, url=agent_url
            )
        )
        for test_case in test_cases
    ]
    deepeval_test_cases = await asyncio.gather(*tasks)

    # === Define Metrics ===

    # 1. Answer Relevance (GEval)
    answer_relevance = GEval(
        name="Correctness",
        criteria="Determine whether the actual output responds to the input, based on the input and the expected output. Evaluate the content of the output, not the styling. CRITICAL: Content wrapped in {{...}} placeholders represents variable information that WILL differ between runs - these are NOT meant to be exact matches. The evaluator must ignore differences in {{...}} placeholder content and only assess whether the overall structure, relevant sections, and non-placeholder content are present and appropriate.",
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        model="gpt-4o-mini",
    )

    # 2. Tool Correctness Metric
    tool_correctness = ToolCorrectnessMetric(should_consider_ordering=True)

    class ArgumentCorrectnessMetric(ToolCorrectnessMetric):
        """Override the name attribute."""

        @property
        def __name__(self) -> Literal["Argument Correctness"]:
            return "Argument Correctness"

    tool_arguments = ArgumentCorrectnessMetric(
        evaluation_params=[ToolCallParams.INPUT_PARAMETERS], include_reason=True
    )

    # === Run Evaluation ===
    results = evaluate(
        deepeval_test_cases, [answer_relevance, tool_correctness, tool_arguments]
    )

    # Collect individual results for detailed.json
    detailed_results = {}
    for i, test_case in enumerate(test_cases):
        # Get decoded response from the test case's additional_metadata
        additional_metadata = deepeval_test_cases[i].additional_metadata
        decoded = {
            "response": deepeval_test_cases[i].actual_output,
            "tool_calls": additional_metadata.get("actual_tool_calls", [])
            if additional_metadata
            else [],
        }
        # Extract evaluation results for this test case
        # !!The result test case order is not guaranteed to match the input order
        test_result = next(
            result
            for result in results.test_results
            if result.name == test_case["name"]
        )

        # Create metrics
        metrics = []
        metrics_data = test_result.metrics_data
        if metrics_data:
            for metric in metrics_data:
                metrics.append(
                    MetricResult(
                        name=metric.name,
                        score=metric.score if metric.score is not None else 0.0,
                        success=metric.success,
                        threshold=metric.threshold,
                        reason=metric.reason if metric.reason is not None else "",
                    )
                )

        evaluation_results = {"metrics": [metric.model_dump() for metric in metrics]}

        # Collect results instead of saving individually
        detailed_results[test_case["name"]] = collect_test_case_results(
            test_case, decoded, evaluation_results
        )

    # Save detailed results
    output_dir = eval_dir / "output"
    output_dir.mkdir(exist_ok=True)

    with open(output_dir / "detailed.json", "w") as f:
        json.dump(detailed_results, f, indent=2, default=str)

    # Compute and save overall results (scores.json)
    overall_results = compute_overall_results(detailed_results)

    with open(output_dir / "scores.json", "w") as f:
        json.dump(overall_results.model_dump(), f, indent=2, default=str)

    logger.info(
        f"Evaluation complete! Processed {overall_results.total_tests} test cases"
    )


if __name__ == "__main__":
    load_dotenv()
    os.environ["OPENAI_API_KEY"] = os.getenv("NEUROAGENT_LLM__OPENAI_TOKEN", "")

    parser = get_parser()
    args = parser.parse_args()
    asyncio.run(run_eval(**vars(args)))
