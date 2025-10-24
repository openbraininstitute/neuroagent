"""Run the agent routine."""

import asyncio
import copy
import json
import logging
import uuid
from collections import defaultdict
from typing import Any, AsyncIterator

from openai import AsyncOpenAI, AsyncStream
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk
from pydantic import BaseModel, ValidationError

from neuroagent.app.database.sql_schemas import (
    Entity,
    Messages,
    Task,
    TokenConsumption,
    TokenType,
    ToolCalls,
)
from neuroagent.new_types import (
    Agent,
    Response,
    Result,
)
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import (
    complete_partial_json,
    get_entity,
    get_token_count,
    merge_chunk,
    messages_to_openai_content,
)

logger = logging.getLogger(__name__)


class AgentsRoutine:
    """Agents routine class. Wrapper for all the functions running the agent."""

    def __init__(self, client: AsyncOpenAI | None = None) -> None:
        if not client:
            client = AsyncOpenAI()
        self.client = client

    async def get_chat_completion(
        self,
        agent: Agent,
        history: list[dict[str, str]],
        context_variables: dict[str, Any],
        model_override: str | None,
        stream: bool = False,
    ) -> AsyncStream[ChatCompletionChunk]:
        """Send the OpenAI request."""
        context_variables = defaultdict(str, context_variables)
        instructions = (
            agent.instructions(context_variables)  # type: ignore
            if callable(agent.instructions)
            else agent.instructions
        )
        messages = [{"role": "system", "content": instructions}] + history

        tools = [tool.pydantic_to_openai_schema() for tool in agent.tools]

        create_params = {
            "messages": messages,
            "model": model_override or agent.model,
            "stream": stream,
            "seed": 12008,
            "temperature": agent.temperature,
            "tools": tools or None,
            "tool_choice": agent.tool_choice,
        }
        if stream:
            create_params["stream_options"] = {"include_usage": True}
        if agent.model == "gpt-5-mini":
            create_params["reasoning_effort"] = "minimal"

        if tools:
            create_params["parallel_tool_calls"] = agent.parallel_tool_calls
        return await self.client.chat.completions.create(**create_params)  # type: ignore

    def handle_function_result(self, result: Result | Agent | BaseModel) -> Result:
        """Check if agent handoff or regular tool call."""
        match result:
            case Result() as result:
                return result

            case Agent() as agent:
                return Result(
                    value=json.dumps({"assistant": agent.name}),
                    agent=agent,
                )
            case BaseModel() as model:
                try:
                    return Result(value=model.model_dump_json())
                except json.JSONDecodeError:
                    return Result(value=str(result))
            case _:
                error_message = f"Failed to parse the result: {result}. Make sure the tool returns a pydantic BaseModel or Result object."
                raise TypeError(error_message)

    async def execute_tool_calls(
        self,
        tool_calls: list[ToolCalls],
        tools: list[type[BaseTool]],
        context_variables: dict[str, Any],
    ) -> Response:
        """Run async tool calls."""
        tasks = [
            asyncio.create_task(
                self.handle_tool_call(
                    tool_call=tool_call,
                    tools=tools,
                    context_variables=context_variables,
                )
            )
            for tool_call in tool_calls
        ]
        results = await asyncio.gather(*tasks)
        messages, agents = zip(*results)
        try:
            agent = next((agent for agent in reversed(agents) if agent is not None))
        except StopIteration:
            agent = None

        return Response(
            messages=list(messages), agent=agent, context_variables=context_variables
        )

    async def handle_tool_call(
        self,
        tool_call: ToolCalls,
        tools: list[type[BaseTool]],
        context_variables: dict[str, Any],
        raise_validation_errors: bool = False,
    ) -> tuple[dict[str, str], Agent | None]:
        """Run individual tools."""
        tool_map = {tool.name: tool for tool in tools}

        name = tool_call.name
        # handle missing tool case, skip to next tool
        if name not in tool_map:
            return {
                "role": "tool",
                "tool_call_id": tool_call.tool_call_id,
                "tool_name": name,
                "content": f"Error: Tool {name} not found.",
            }, None
        kwargs = json.loads(tool_call.arguments)

        tool = tool_map[name]
        try:
            input_schema: BaseModel = tool.__annotations__["input_schema"](**kwargs)
        except ValidationError as err:
            # Raise validation error if requested
            if raise_validation_errors:
                raise err
            else:
                # Otherwise transform it into an OpenAI response for the model to retry
                response = {
                    "role": "tool",
                    "tool_call_id": tool_call.tool_call_id,
                    "tool_name": name,
                    "content": err.json(),
                }
                return response, None

        try:
            tool_metadata = tool.__annotations__["metadata"](**context_variables)
        except ValidationError as err:
            # Raise validation error if requested
            if raise_validation_errors:
                raise err
            else:
                # Otherwise transform it into an OpenAI response for the model to retry
                response = {
                    "role": "tool",
                    "tool_call_id": tool_call.tool_call_id,
                    "tool_name": name,
                    "content": "The user is not allowed to run this tool. Don't call it again.",
                }
                return response, None

        logger.info(
            f"Entering {name}. Inputs: {input_schema.model_dump(exclude_defaults=True)}."
        )
        tool_instance = tool(input_schema=input_schema, metadata=tool_metadata)
        # pass context_variables to agent functions
        try:
            raw_result = await tool_instance.arun()
            if hasattr(tool_instance.metadata, "token_consumption"):
                context_variables["usage_dict"][tool_call.tool_call_id] = (
                    tool_instance.metadata.token_consumption
                )
        except Exception as err:
            response = {
                "role": "tool",
                "tool_call_id": tool_call.tool_call_id,
                "tool_name": name,
                "content": str(err),
            }
            return response, None

        result: Result = self.handle_function_result(raw_result)
        response = {
            "role": "tool",
            "tool_call_id": tool_call.tool_call_id,
            "tool_name": name,
            "content": result.value,
        }
        if result.agent:
            agent = result.agent
        else:
            agent = None
        return response, agent

    async def astream(
        self,
        agent: Agent,
        messages: list[Messages],
        context_variables: dict[str, Any] = {},
        model_override: str | None = None,
        max_turns: int = 10,
        max_parallel_tool_calls: int = 5,
    ) -> AsyncIterator[str]:
        """Stream the agent response."""
        try:
            active_agent = agent
            content = await messages_to_openai_content(messages)
            history = copy.deepcopy(content)

            turns = 0
            metadata_data = []

            # In case of HIL, the start steps breaks Vercel and adds a new part.
            if messages[-1].entity == Entity.USER:
                yield f"data: {json.dumps({'type': 'start', 'messageId': f'msg_{uuid.uuid4().hex}'})}\n\n"

            while turns <= max_turns:
                # We need to redefine the tool map since the tools can change on agent switch.
                tool_map = {tool.name: tool for tool in active_agent.tools}
                # Force an AI message once max turns reached.
                # I.e. we do a total number of turns of max_turns + 1
                # The +1 being the final AI message.
                if turns == max_turns:
                    agent.tool_choice = "none"
                    agent.instructions = "You are a very nice assistant that is unable to further help the user due to rate limiting. The user just reached the maximum amount of turns he can take with you in a single query. Your one and only job is to let him know that in a nice way, and that the only way to continue the conversation is to send another message. Completely disregard his demand since you cannot fulfill it, simply state that he reached the limit."

                message: dict[str, Any] = {
                    "content": "",
                    "reasoning": "",
                    "sender": agent.name,
                    "role": "assistant",
                    "function_call": None,
                    "tool_calls": defaultdict(
                        lambda: {
                            "function": {"arguments": "", "name": ""},
                            "id": "",
                            "type": "",
                        }
                    ),
                }

                # get completion with current history, agent
                completion = await self.get_chat_completion(
                    agent=active_agent,
                    history=history,
                    context_variables=context_variables,
                    model_override=model_override,
                    stream=True,
                )

                turns += 1
                draft_tool_calls: list[dict[str, str]] = []
                draft_tool_calls_index = -1
                text_id = f"text_{uuid.uuid4().hex}"
                text_started = False
                reasoning_id = f"text_{uuid.uuid4().hex}"
                reasoning_started = False
                async for chunk in completion:
                    for choice in chunk.choices:
                        if choice.finish_reason == "stop":
                            if choice.delta.content:
                                if not text_started:
                                    yield f"data: {json.dumps({'type': 'text-start', 'id': text_id})}\n\n"
                                    text_started = True

                                yield f"data: {json.dumps({'type': 'text-delta', 'id': text_id, 'delta': choice.delta.content})}\n\n"

                        elif choice.finish_reason == "tool_calls":
                            # Some models stream the whole tool call in one chunk.
                            if not draft_tool_calls and choice.delta.tool_calls:
                                for tc in choice.delta.tool_calls:
                                    tc.id = uuid.uuid4().hex
                                    draft_tool_calls.append(
                                        {
                                            "arguments": tc.function.arguments or "{}"
                                            if tc.function
                                            else "{}",
                                            "id": tc.id,
                                            "name": tc.function.name or ""
                                            if tc.function
                                            else "",
                                        }
                                    )

                            for draft_tool_call in draft_tool_calls:
                                input_args = json.loads(
                                    draft_tool_call["arguments"] or "{}"
                                )
                                try:
                                    input_schema: type[BaseModel] = tool_map[
                                        draft_tool_call["name"]
                                    ].__annotations__["input_schema"]

                                    args = input_schema(**input_args).model_dump(
                                        mode="json"
                                    )
                                except ValidationError:
                                    args = input_args
                                yield f"data: {json.dumps({'type': 'tool-input-available', 'toolCallId': draft_tool_call['id'], 'toolName': draft_tool_call['name'], 'input': args})}\n\n"

                        # Check for tool calls
                        elif choice.delta.tool_calls:
                            for tool_call in choice.delta.tool_calls:
                                if tool_call is None:
                                    continue
                                if tool_call.function is None:
                                    continue
                                if tool_call.id is not None:
                                    tool_call.id = (
                                        uuid.uuid4().hex
                                    )  # Set provider_id to random uuid

                                id = tool_call.id
                                name = tool_call.function.name
                                arguments = tool_call.function.arguments
                                if id is not None:
                                    draft_tool_calls_index += 1
                                    draft_tool_calls.append(
                                        {"id": id, "name": name, "arguments": ""}  # type: ignore
                                    )
                                    yield f"data: {json.dumps({'type': 'tool-input-start', 'toolCallId': id, 'toolName': name})}\n\n"

                                if arguments:
                                    current_id = (
                                        id
                                        or draft_tool_calls[draft_tool_calls_index][
                                            "id"
                                        ]
                                    )
                                    yield f"data: {json.dumps({'type': 'tool-input-delta', 'toolCallId': current_id, 'inputTextDelta': arguments})}\n\n"
                                    draft_tool_calls[draft_tool_calls_index][
                                        "arguments"
                                    ] += arguments
                        elif (
                            hasattr(choice.delta, "reasoning")
                            and choice.delta.reasoning
                        ):
                            if not reasoning_started:
                                yield f"data: {json.dumps({'type': 'reasoning-start', 'id': reasoning_id})}\n\n"
                                reasoning_started = True

                            yield f"data: {json.dumps({'type': 'reasoning-delta', 'id': reasoning_id, 'delta': choice.delta.reasoning})}\n\n"

                        else:
                            if choice.delta.content is not None:
                                if not text_started:
                                    yield f"data: {json.dumps({'type': 'text-start', 'id': text_id})}\n\n"
                                    text_started = True

                                yield f"data: {json.dumps({'type': 'text-delta', 'id': text_id, 'delta': choice.delta.content})}\n\n"

                        delta_json = choice.delta.model_dump()
                        delta_json.pop("role", None)
                        merge_chunk(message, delta_json)

                if reasoning_started:
                    yield f"data: {json.dumps({'type': 'reasoning-end', 'id': reasoning_id})}\n\n"
                    reasoning_started = False

                if text_started:
                    yield f"data: {json.dumps({'type': 'text-end', 'id': text_id})}\n\n"
                    text_started = False

                message["tool_calls"] = list(message.get("tool_calls", {}).values())
                if not message["tool_calls"]:
                    message["tool_calls"] = None

                # If tool calls requested, instantiate them as an SQL compatible class

                if message["tool_calls"]:
                    tool_calls = [
                        ToolCalls(
                            tool_call_id=tool_call["id"],
                            name=tool_call["function"]["name"],
                            arguments=tool_call["function"]["arguments"],
                        )
                        for tool_call in message["tool_calls"]
                    ]
                else:
                    tool_calls = []

                # Append the history with the json version
                history.append(copy.deepcopy(message))

                # We add a true / false to check if there were tool calls.
                message["tool_calls"] = (
                    "tool_calls" in message and message["tool_calls"]
                )

                # Stage the new message for addition to DB
                token_count = get_token_count(chunk.usage)
                token_consumption = [
                    TokenConsumption(
                        type=token_type,
                        task=Task.CHAT_COMPLETION,
                        count=count,
                        model=agent.model,
                    )
                    for token_type, count in [
                        (TokenType.INPUT_CACHED, token_count["input_cached"]),
                        (TokenType.INPUT_NONCACHED, token_count["input_noncached"]),
                        (TokenType.COMPLETION, token_count["completion"]),
                    ]
                    if count
                ]
                messages.append(
                    Messages(
                        thread_id=messages[-1].thread_id,
                        entity=get_entity(message),
                        content=json.dumps(message),
                        tool_calls=tool_calls,
                        is_complete=True,
                        token_consumption=token_consumption,
                    )
                )

                if not messages[-1].tool_calls:
                    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"
                    break

                # kick out tool calls that require HIL
                tool_calls_to_execute = [
                    tool_call
                    for tool_call in messages[-1].tool_calls
                    if not tool_map[tool_call.name].hil
                ]

                tool_calls_with_hil = [
                    tool_call
                    for tool_call in messages[-1].tool_calls
                    if tool_map[tool_call.name].hil
                ]

                # handle function calls, updating context_variables, and switching agents
                if tool_calls_to_execute:
                    tool_calls_executed = await self.execute_tool_calls(
                        tool_calls_to_execute[:max_parallel_tool_calls],
                        active_agent.tools,
                        context_variables,
                    )
                    tool_calls_executed.messages.extend(
                        [
                            {
                                "role": "tool",
                                "tool_call_id": call.tool_call_id,
                                "tool_name": call.name,
                                "content": f"The tool {call.name} with arguments {call.arguments} could not be executed due to rate limit. Call it again.",
                            }
                            for call in tool_calls_to_execute[max_parallel_tool_calls:]
                        ]
                    )
                else:
                    tool_calls_executed = Response(
                        messages=[], agent=None, context_variables=context_variables
                    )

                # Before extending history, yield each tool response
                for tool_response in tool_calls_executed.messages:
                    yield f"data: {json.dumps({'type': 'tool-output-available', 'toolCallId': tool_response['tool_call_id'], 'output': tool_response['content']})}\n\n"

                yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                for tool_response in tool_calls_executed.messages:
                    # Check if an LLM has been called inside of the tool
                    if context_variables["usage_dict"].get(
                        tool_response["tool_call_id"]
                    ):
                        # Get the consumption dict for the given tool
                        tool_call_consumption = context_variables["usage_dict"][
                            tool_response["tool_call_id"]
                        ]

                        # Set consumption in SQL classess
                        token_consumption = [
                            TokenConsumption(
                                type=token_type,
                                task=Task.CALL_WITHIN_TOOL,
                                count=count,
                                model=tool_call_consumption["model"],
                            )
                            for token_type, count in [
                                (
                                    TokenType.INPUT_CACHED,
                                    tool_call_consumption["input_cached"],
                                ),
                                (
                                    TokenType.INPUT_NONCACHED,
                                    tool_call_consumption["input_noncached"],
                                ),
                                (
                                    TokenType.COMPLETION,
                                    tool_call_consumption["completion"],
                                ),
                            ]
                            if count
                        ]
                    else:
                        token_consumption = []

                    messages.append(
                        Messages(
                            thread_id=messages[-1].thread_id,
                            entity=Entity.TOOL,
                            content=json.dumps(tool_response),
                            is_complete=True,
                            token_consumption=token_consumption,
                        )
                    )

                # If the tool call response contains HIL validation, do not update anything and return
                if tool_calls_with_hil:
                    metadata_data = [
                        {"toolCallId": msg.tool_call_id, "validated": "pending"}
                        for msg in tool_calls_with_hil
                    ]

                    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"
                    break

                history.extend(tool_calls_executed.messages)
                context_variables.update(tool_calls_executed.context_variables)
                if tool_calls_executed.agent:
                    active_agent = tool_calls_executed.agent

            if metadata_data:
                yield f"data: {json.dumps({'type': 'finish', 'messageMetadata': {'hil': metadata_data}})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'finish'})}\n\n"
            yield "data: [DONE]\n\n"

        # User interrupts streaming
        except asyncio.exceptions.CancelledError:
            if isinstance(message["tool_calls"], defaultdict):
                message["tool_calls"] = list(message.get("tool_calls", {}).values())

            if not message["tool_calls"]:
                message["tool_calls"] = None
            else:
                # Attempt to fix partial JSONs if any
                for elem in message["tool_calls"]:
                    elem["function"]["arguments"] = complete_partial_json(
                        elem["function"]["arguments"]
                    )
            logger.debug(f"Stream interrupted. Partial message {message}")

            if message["tool_calls"]:
                tool_calls = [
                    ToolCalls(
                        tool_call_id=tool_call["id"],
                        name=tool_call["function"]["name"],
                        arguments=tool_call["function"]["arguments"],
                    )
                    for tool_call in message["tool_calls"]
                ]
            else:
                tool_calls = []

            # If the partial message hasn't been appended and the last message is not an AI_TOOL, append partial message
            if (
                json.dumps(message) != messages[-1].content
                and messages[-1].entity != Entity.AI_TOOL
            ):
                messages.append(
                    Messages(
                        thread_id=messages[-1].thread_id,
                        entity=get_entity(message),
                        content=json.dumps(message),
                        tool_calls=tool_calls,
                        is_complete=False,
                    )
                )

            # Append default tool message to partial tool calls
            if messages[-1].entity == Entity.AI_TOOL:
                messages.extend(
                    [
                        Messages(
                            thread_id=messages[-1].thread_id,
                            entity=Entity.TOOL,
                            content=json.dumps(
                                {
                                    "role": "tool",
                                    "tool_call_id": call.tool_call_id,
                                    "tool_name": call.name,
                                    "content": "Tool execution aborted by the user.",
                                }
                            ),
                            is_complete=False,
                        )
                        for call in tool_calls
                    ]
                )
