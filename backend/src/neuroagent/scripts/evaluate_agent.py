"""Evaluate agent responses and tool calling capabilities."""

import argparse
import asyncio
import inspect
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from deepeval.evaluate import evaluate
from deepeval.evaluate.types import EvaluationResult
from deepeval.metrics import ArgumentCorrectnessMetric, GEval, ToolCorrectnessMetric
from deepeval.test_case import LLMTestCase, LLMTestCaseParams, ToolCall
from dotenv import load_dotenv
from pydantic import BaseModel, Field

import neuroagent.tools
from neuroagent.tools.base_tool import BaseTool

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


class ExpectedToolCalls(BaseModel):
    """Model for expected_tool_calls.json files."""
    tool_calls: list[ToolCallModel] = Field(default_factory=list)
    
    @classmethod
    def from_list(cls, tool_calls_list: list[dict[str, Any]]) -> "ExpectedToolCalls":
        """Create from list of tool call dictionaries."""
        return cls(tool_calls=[ToolCallModel(**tc) for tc in tool_calls_list])


class ActualToolCalls(BaseModel):
    """Model for actual_tool_calls.json files."""
    tool_calls: list[ToolCallModel] = Field(default_factory=list)
    
    @classmethod
    def from_list(cls, tool_calls_list: list[dict[str, Any]]) -> "ActualToolCalls":
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
        default="eval",
        help="Path to the evaluation directory containing individual/ and aggregate/ folders.",
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


def load_test_cases(eval_dir: Path) -> list[dict[str, Any]]:
    """Load test cases from the individual/ folder structure."""
    individual_dir = eval_dir / "individual"
    test_cases = []
    
    for test_case_dir in individual_dir.iterdir():
        if not test_case_dir.is_dir():
            continue
            
        input_dir = test_case_dir / "input"
        if not input_dir.exists():
            logger.warning(f"No input directory found for {test_case_dir.name}")
            continue
            
        # Load test case data
        try:
            with open(input_dir / "user.md", "r") as f:
                input_text = f.read()
            
            with open(input_dir / "expected_output.md", "r") as f:
                expected_output = f.read()
                
            # Load and validate expected tool calls
            with open(input_dir / "expected_tool_calls.json", "r") as f:
                expected_tool_calls_data = json.load(f)
            expected_tool_calls = ExpectedToolCalls.from_list(expected_tool_calls_data)
                
            # Load and validate params
            with open(input_dir / "params.json", "r") as f:
                params_data = json.load(f)
            params = TestCaseParams(**params_data)
                
            test_cases.append({
                "name": test_case_dir.name,
                "input": input_text,
                "expected_output": expected_output,
                "expected_tool_calls": expected_tool_calls_data,  # Keep as list for compatibility
                "params": params,
                "test_case_dir": test_case_dir
            })
            
        except Exception as e:
            logger.error(f"Error loading test case {test_case_dir.name}: {e}")
            continue
    
    return test_cases


def save_test_case_results(test_case: dict[str, Any], decoded_response: dict[str, Any], evaluation_results: dict[str, Any]) -> None:
    """Save test case results to the output/ folder."""
    output_dir = test_case["test_case_dir"] / "output"
    output_dir.mkdir(exist_ok=True)
    
    # Save AI response
    with open(output_dir / "ai.md", "w") as f:
        f.write(decoded_response["response"])
    
    # Save actual tool calls with validation
    actual_tool_calls = ActualToolCalls.from_list(decoded_response.get("tool_calls", []))
    with open(output_dir / "actual_tool_calls.json", "w") as f:
        json.dump(actual_tool_calls.model_dump(), f, indent=2)
    
    # Save evaluation results with validation and timestamp
    eval_results = EvaluationResults(**evaluation_results)
    with open(output_dir / "results.json", "w") as f:
        json.dump(eval_results.model_dump(), f, indent=2, default=str)


def compute_overall_results(eval_dir: Path) -> dict[str, Any]:
    """Compute overall results from all individual test cases."""
    individual_dir = eval_dir / "individual"
    overall_results = {
        "total_tests": 0,
        "metrics": {}
    }
    
    # Collect all test results
    test_results = []
    
    for test_case_dir in individual_dir.iterdir():
        if not test_case_dir.is_dir():
            continue
            
        output_dir = test_case_dir / "output"
        results_file = output_dir / "results.json"
        
        if not results_file.exists():
            logger.warning(f"No results found for {test_case_dir.name}")
            continue
            
        try:
            with open(results_file, "r") as f:
                test_data = json.load(f)
                
            overall_results["total_tests"] += 1
            
            # Extract metrics for this test case
            metrics = test_data.get("metrics", [])
            for metric in metrics:
                metric_name = metric.get("name", "Unknown")
                score = metric.get("score", 0)
                
                if metric_name not in overall_results["metrics"]:
                    overall_results["metrics"][metric_name] = []
                
                overall_results["metrics"][metric_name].append({
                    "test_name": test_case_dir.name,
                    "score": score
                })
                
        except Exception as e:
            logger.error(f"Error processing results for {test_case_dir.name}: {e}")
            continue
    
    # Sort each metric's results by score (highest to lowest)
    for metric_name in overall_results["metrics"]:
        overall_results["metrics"][metric_name].sort(
            key=lambda x: x["score"], reverse=True
        )
    
    return overall_results


async def eval_sample(
    test_case: dict[str, Any],
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    url: str = "http://localhost:8000",
) -> tuple[LLMTestCase, dict[str, Any]]:
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
                f"{url}/qa/chat_streamed/{thread_id}", json={"content": test_case["input"]}
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
                logger.warning(f"Tool {tool_call['name']} not found.")
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
        input=test_case["input"],
        actual_output=decoded["response"],
        expected_output=test_case["expected_output"],
        tools_called=tools_called,
        expected_tools=expected_tool_calls,
        additional_metadata={
            "actual_tool_calls": decoded.get("tool_calls", []),
        },
    )

    return test_case_obj, decoded


async def run_eval(
    token: str,
    eval_dir: Path = Path("eval"),
    agent_url: str = "http://localhost:8000",
    concurrent_requests: int = 5,
    timeout: float = 60.0,
) -> None:
    """Run the evaluation on the test cases."""
    # Load test cases from folder structure
    test_cases = load_test_cases(eval_dir)
    logger.info(f"Loaded {len(test_cases)} test cases")
    
    client = httpx.AsyncClient(
        timeout=timeout,
        headers={"Authorization": f"Bearer {token}"}
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
    results = await asyncio.gather(*tasks)
    
    # Separate the results
    deepeval_test_cases = [result[0] for result in results]
    decoded_responses = [result[1] for result in results]

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
    tool_arguments = ArgumentCorrectnessMetric(model="gpt-4o-mini")

    # === Run Evaluation ===
    results = evaluate(
        deepeval_test_cases, [answer_relevance, tool_correctness, tool_arguments]
    )
    
    # Save individual results
    for i, (test_case, decoded) in enumerate(zip(test_cases, decoded_responses)):
        # Extract evaluation results for this test case
        test_result = results.test_results[i]
        
        # Create metrics
        metrics = []
        for metric in test_result.metrics_data:
            metrics.append(MetricResult(
                name=metric.name,
                score=metric.score,
                success=metric.success,
                threshold=metric.threshold,
                reason=metric.reason,
            ))
        
        evaluation_results = {
            "metrics": [metric.model_dump() for metric in metrics]
        }
        
        save_test_case_results(test_case, decoded, evaluation_results)
    
    # Compute and save overall results
    overall_results = compute_overall_results(eval_dir)
    aggregate_dir = eval_dir / "aggregate"
    aggregate_dir.mkdir(exist_ok=True)
    
    with open(aggregate_dir / "overall_results.json", "w") as f:
        json.dump(overall_results, f, indent=2)
    
    logger.info(f"Evaluation complete! Processed {overall_results['total_tests']} test cases")


if __name__ == "__main__":
    load_dotenv()
    os.environ["OPENAI_API_KEY"] = os.getenv("NEUROAGENT_LLM__OPENAI_TOKEN", "")

    parser = get_parser()
    args = parser.parse_args()
    asyncio.run(run_eval(**vars(args)))
