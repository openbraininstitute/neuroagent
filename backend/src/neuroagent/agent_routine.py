"""Run the agent routine."""

import asyncio
import copy
import json
import logging
import uuid
from collections import defaultdict
from typing import Any, AsyncIterator

from openai import AsyncOpenAI, AsyncStream
from openai.types.responses import (
    ResponseCompletedEvent,
    ResponseContentPartAddedEvent,
    ResponseContentPartDoneEvent,
    ResponseFunctionCallArgumentsDeltaEvent,
    ResponseFunctionToolCall,
    ResponseOutputItemAddedEvent,
    ResponseOutputItemDoneEvent,
    ResponseReasoningSummaryPartAddedEvent,
    ResponseReasoningSummaryPartDoneEvent,
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseStreamEvent,
    ResponseTextDeltaEvent,
)
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
    convert_to_responses_api_format,
    get_entity,
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
    ) -> AsyncStream[ResponseStreamEvent]:
        """Send the OpenAI request."""
        context_variables = defaultdict(str, context_variables)
        instructions = (
            agent.instructions(context_variables)  # type: ignore
            if callable(agent.instructions)
            else agent.instructions
        )

        tools = [tool.pydantic_to_openai_schema() for tool in agent.tools]

        create_params = {
            "instructions": instructions,
            "input": history,
            "model": model_override or agent.model,
            "stream": stream,
            "temperature": agent.temperature,
            "tools": tools or [],
            "include": ["reasoning.encrypted_content"],
            "store": False,
        }

        if agent.tool_choice:
            create_params["tool_choice"] = agent.tool_choice

        if agent.model == "gpt-5-mini":
            create_params["reasoning"] = {"effort": "low", "summary": "auto"}
            create_params["text"] = {"verbosity": "medium"}

        if tools:
            create_params["parallel_tool_calls"] = agent.parallel_tool_calls

        return await self.client.responses.create(**create_params)  # type: ignore

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
                    "reasoning": [],
                    "sender": agent.name,
                    "role": "assistant",
                    "function_call": None,
                    "tool_calls": [],
                    "encrypted_reasoning": "",
                }
                # for streaming interrupt
                temp_stream_data: dict[str, Any] = {
                    "content": "",
                    "tool_calls": {},
                    "reasoning": {},
                }

                # get completion with current history, agent
                completion = await self.get_chat_completion(
                    agent=active_agent,
                    history=convert_to_responses_api_format(history),
                    context_variables=context_variables,
                    model_override=model_override,
                    stream=True,
                )

                turns += 1
                usage_data = None
                tool_call_ID_mapping: dict[str, str] = {}
                async for event in completion:
                    match event:
                        # === REASONING ===
                        # Reasoning start
                        case ResponseReasoningSummaryPartAddedEvent():
                            temp_stream_data["reasoning"][event.item_id] = ""
                            yield f"data: {json.dumps({'type': 'start-step'})}\n\n"
                            yield f"data: {json.dumps({'type': 'reasoning-start', 'id': event.item_id})}\n\n"

                        # Reasoning deltas
                        case ResponseReasoningSummaryTextDeltaEvent():
                            temp_stream_data["reasoning"][event.item_id] += event.delta
                            yield f"data: {json.dumps({'type': 'reasoning-delta', 'id': event.item_id, 'delta': event.delta})}\n\n"

                        # Reasoning end
                        case ResponseReasoningSummaryPartDoneEvent():
                            message["reasoning"].append(event.part.text)
                            temp_stream_data["reasoning"].pop(event.item_id, None)
                            yield f"data: {json.dumps({'type': 'reasoning-end', 'id': event.item_id})}\n\n"
                            yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                        # === TEXT ===
                        # Text start
                        case ResponseContentPartAddedEvent():
                            yield f"data: {json.dumps({'type': 'text-start', 'id': event.item_id})}\n\n"

                        # Text Delta
                        case ResponseTextDeltaEvent():
                            temp_stream_data["content"] += event.delta
                            yield f"data: {json.dumps({'type': 'text-delta', 'id': event.item_id, 'delta': event.delta})}\n\n"

                        # Text end
                        case ResponseContentPartDoneEvent() if (
                            hasattr(event.part, "text") and event.part.text
                        ):
                            message["content"] = event.part.text
                            temp_stream_data["content"] = ""
                            yield f"data: {json.dumps({'type': 'text-end', 'id': event.item_id})}\n\n"
                            yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                        # === TOOL CALLS ===
                        # Tool call starts
                        case ResponseOutputItemAddedEvent() if (
                            isinstance(event.item, ResponseFunctionToolCall)
                            and event.item.id
                        ):
                            tool_call_ID_mapping[event.item.id] = (
                                uuid.uuid4().hex
                            )  # Add generic UUID to event ID
                            temp_stream_data["tool_calls"][
                                tool_call_ID_mapping[event.item.id]
                            ] = {"name": event.item.name, "arguments": ""}
                            yield f"data: {json.dumps({'type': 'start-step'})}\n\n"
                            yield f"data: {json.dumps({'type': 'tool-input-start', 'toolCallId': tool_call_ID_mapping[event.item.id], 'toolName': event.item.name})}\n\n"

                        # Tool call deltas
                        case ResponseFunctionCallArgumentsDeltaEvent() if event.item_id:
                            temp_stream_data["tool_calls"][
                                tool_call_ID_mapping[event.item_id]
                            ]["arguments"] += event.delta
                            yield f"data: {json.dumps({'type': 'tool-input-delta', 'toolCallId': tool_call_ID_mapping[event.item_id], 'inputTextDelta': event.delta})}\n\n"

                        # Tool call end
                        case ResponseOutputItemDoneEvent() if (
                            isinstance(event.item, ResponseFunctionToolCall)
                            and event.item.id
                        ):
                            input_args = event.item.arguments
                            try:
                                input_schema: type[BaseModel] = tool_map[
                                    event.item.name
                                ].__annotations__["input_schema"]
                                validated_args = input_schema(
                                    **json.loads(input_args)
                                ).model_dump(mode="json")
                                args = json.dumps(validated_args)
                            except ValidationError:
                                args = input_args
                            message["tool_calls"].append(
                                {
                                    "id": tool_call_ID_mapping[event.item.id],
                                    "type": "function",
                                    "function": {
                                        "name": event.item.name,
                                        "arguments": args,
                                    },
                                }
                            )
                            temp_stream_data["tool_calls"].pop(
                                tool_call_ID_mapping[event.item.id], None
                            )
                            yield f"data: {json.dumps({'type': 'tool-input-available', 'toolCallId': tool_call_ID_mapping[event.item.id], 'toolName': event.item.name, 'input': json.loads(args)})}\n\n"
                            yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                        # === Usage ===
                        # Handle usage/token information and ecrypted reasoning.
                        case ResponseCompletedEvent():
                            message["encrypted_reasoning"] = next(
                                (
                                    part.encrypted_content
                                    for part in event.response.output
                                    if part.type == "reasoning"
                                ),
                                "",
                            )
                            usage_data = event.response.usage

                        # case _:
                        #     print(event.type)

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

                token_consumption = []
                if usage_data:
                    input_cached = (
                        getattr(
                            getattr(usage_data, "input_tokens_details", 0),
                            "cached_tokens",
                            0,
                        )
                        or 0
                    )
                    input_noncached = (
                        getattr(usage_data, "input_tokens", 0) - input_cached
                    )
                    completion_tokens = getattr(usage_data, "output_tokens", 0) or 0

                    token_consumption = [
                        TokenConsumption(
                            type=token_type,
                            task=Task.CHAT_COMPLETION,
                            count=count,
                            model=agent.model,
                        )
                        for token_type, count in [
                            (TokenType.INPUT_CACHED, input_cached),
                            (TokenType.INPUT_NONCACHED, input_noncached),
                            (TokenType.COMPLETION, completion_tokens),
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
                        {
                            "toolCallId": msg.tool_call_id,
                            "validated": "pending",
                            "isComplete": True,
                        }
                        for msg in tool_calls_with_hil
                    ]

                    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"
                    break

                history.extend(tool_calls_executed.messages)
                context_variables.update(tool_calls_executed.context_variables)
                if tool_calls_executed.agent:
                    active_agent = tool_calls_executed.agent

            if metadata_data:
                yield f"data: {json.dumps({'type': 'finish', 'messageMetadata': {'toolCalls': metadata_data}})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'finish'})}\n\n"
            yield "data: [DONE]\n\n"

        # User interrupts streaming
        except asyncio.exceptions.CancelledError:
            if temp_stream_data["content"]:
                message["content"] = temp_stream_data["content"]

            if temp_stream_data["reasoning"]:
                for reasoning_summary in temp_stream_data["reasoning"].values():
                    message["reasoning"].append(reasoning_summary)

            if temp_stream_data["tool_calls"]:
                for id, elem in temp_stream_data["tool_calls"].items():
                    message["tool_calls"].append(
                        {
                            "function": {
                                "arguments": complete_partial_json(elem["arguments"]),
                                "name": elem["name"],
                            },
                            "id": id,
                            "type": "function",
                        }
                    )
            else:
                message["tool_calls"] = None

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
                        for call in messages[-1].tool_calls
                    ]
                )
