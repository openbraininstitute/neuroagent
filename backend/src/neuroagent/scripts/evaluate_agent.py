"""Evaluate agent responses and tool calling capabilities."""

import argparse
import asyncio
import inspect
import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx
import pandas as pd
from deepeval.evaluate import evaluate
from deepeval.evaluate.types import EvaluationResult
from deepeval.metrics import ArgumentCorrectnessMetric, GEval, ToolCorrectnessMetric
from deepeval.test_case import LLMTestCase, LLMTestCaseParams, ToolCall
from dotenv import load_dotenv

import neuroagent.tools
from neuroagent.tools.base_tool import BaseTool

logging.basicConfig(
    format="[%(levelname)s]  %(asctime)s %(name)s  %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# NOTE: For now the MCP tools are not included.
all_classes = inspect.getmembers(neuroagent.tools, inspect.isclass)
tool_list: list[type[BaseTool]] = [cls for _, cls in all_classes]


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
        "--dataset-path",
        "-d",
        type=Path,
        default="eval/eval_dataset.csv",
        help="Path where the evaluation samples are. Must have .csv extension,",
    )
    parser.add_argument(
        "--save-path",
        "-s",
        type=Path,
        default="eval/eval_results.csv",
        help="Path where to save the evaluation results. Must have .csv extension,",
    )
    parser.add_argument(
        "--concurrent-requests",
        "-c",
        type=int,
        default=5,
        help="Number of async requests sent concurrently.",
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


def evaluation_result_to_csv(
    evaluation_result: EvaluationResult, csv_path: str = "eval_result.csv"
) -> None:
    """
    Convert a DeepEval EvaluationResult object into a flat pandas DataFrame and saves it as a CSV.

    Parameters
    ----------
    evaluation_result (EvaluationResult):
        The evaluation result object.
    csv_path (str):
        Output file path for the CSV.
    """
    rows = []

    for test_result in evaluation_result.test_results:
        if test_result.metrics_data:
            actual_tool_calls = test_result.additional_metadata["actual_tool_calls"]

            for metric in test_result.metrics_data:
                row = {
                    "test_name": test_result.name,
                    "input": test_result.input,
                    "actual_output": test_result.actual_output
                    if metric.name == "Correctness [GEval]"
                    else actual_tool_calls,
                    "metric_name": metric.name,
                    "score": metric.score,
                    "success": metric.success,
                    "threshold": metric.threshold,
                    "reason": metric.reason,
                    "evaluation_model": metric.evaluation_model,
                    "evaluation_cost": metric.evaluation_cost,
                }
                rows.append(row)
        else:
            raise RuntimeError("No computed metric found.")

    df = pd.DataFrame(rows)
    df.to_csv(csv_path, index=False, float_format="%.6f")
    logger.info(f"Saved evaluation results to {csv_path}")


async def eval_sample(
    sample: pd.Series,
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    url: str = "http://localhost:8000",
) -> LLMTestCase:
    """Run a single sample into our API."""
    logger.info(f"Running sample: {sample['input']}")
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
                f"{url}/qa/chat_streamed/{thread_id}", json={"content": sample["input"]}
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
        for tool in json.loads(sample["expected_tool_calls"])
    ]
    test_case = LLMTestCase(
        input=sample["input"],
        actual_output=decoded["response"],
        expected_output=sample["expected_output"],
        tools_called=tools_called,
        expected_tools=expected_tool_calls,
        additional_metadata={
            "actual_tool_calls": decoded.get("tool_calls", []),
        },
    )

    return test_case


async def run_eval(
    token: str,
    dataset_path: str = "eval_dataset.csv",
    agent_url: str = "http://localhost:8000",
    concurrent_requests: int = 5,
    save_path: str = "eval_result.csv",
) -> None:
    """Run the evaluation on the dataset."""
    # Create dataset
    dataset = pd.read_csv(dataset_path)
    client = httpx.AsyncClient(
        timeout=6000, headers={"Authorization": f"Bearer {token}"}
    )
    semaphore = asyncio.Semaphore(concurrent_requests)

    tasks = [
        asyncio.create_task(
            eval_sample(
                sample=sample, client=client, semaphore=semaphore, url=agent_url
            )
        )
        for _, sample in dataset.iterrows()
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
    tool_arguments = ArgumentCorrectnessMetric(model="gpt-4o-mini")

    # === Run Evaluation ===
    results = evaluate(
        deepeval_test_cases, [answer_relevance, tool_correctness, tool_arguments]
    )
    evaluation_result_to_csv(results, save_path)


if __name__ == "__main__":
    load_dotenv()
    os.environ["OPENAI_API_KEY"] = os.getenv("NEUROAGENT_LLM__OPENAI_TOKEN", "")

    parser = get_parser()
    args = parser.parse_args()
    asyncio.run(run_eval(**vars(args)))
