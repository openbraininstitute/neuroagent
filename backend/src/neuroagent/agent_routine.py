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
    ResponseFunctionToolCallOutputItem,
    ResponseOutputItemAddedEvent,
    ResponseOutputItemDoneEvent,
    ResponseOutputMessage,
    ResponseReasoningItem,
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
    PartType,
    Task,
)
from neuroagent.new_types import (
    Agent,
    Response,
    Result,
)
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import (
    append_part,
    complete_partial_json,
    get_main_LLM_token_consumption,
    get_previous_hil_metadata,
    get_tool_token_consumption,
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
            "text": {"verbosity": "medium"},
        }

        if agent.tool_choice:
            create_params["tool_choice"] = agent.tool_choice

        if agent.reasoning is not None:
            create_params["reasoning"] = {"effort": agent.reasoning, "summary": "auto"}

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
        tool_calls: list[ResponseFunctionToolCall],
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
        tool_call: ResponseFunctionToolCall,
        tools: list[type[BaseTool]],
        context_variables: dict[str, Any],
        raise_validation_errors: bool = False,
    ) -> tuple[ResponseFunctionToolCallOutputItem, Agent | None]:
        """Run individual tools."""
        tool_map = {tool.name: tool for tool in tools}

        name = tool_call.name
        # handle missing tool case, skip to next tool
        if name not in tool_map:
            return ResponseFunctionToolCallOutputItem(
                id=tool_call.id or "",
                call_id=tool_call.call_id,
                status="incomplete",
                output=f"Error: Tool {name} not found.",
                type="function_call_output",
            ), None
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
                return ResponseFunctionToolCallOutputItem(
                    id=tool_call.id or "",
                    call_id=tool_call.call_id,
                    status="incomplete",
                    output=err.json(),
                    type="function_call_output",
                ), None

        try:
            tool_metadata = tool.__annotations__["metadata"](**context_variables)
        except ValidationError as err:
            # Raise validation error if requested
            if raise_validation_errors:
                raise err
            else:
                # Otherwise transform it into an OpenAI response for the model to retry
                return ResponseFunctionToolCallOutputItem(
                    id=tool_call.id or "",
                    call_id=tool_call.call_id,
                    status="incomplete",
                    output="The user is not allowed to run this tool. Don't call it again.",
                    type="function_call_output",
                ), None

        logger.info(
            f"Entering {name}. Inputs: {input_schema.model_dump(exclude_defaults=True)}."
        )
        tool_instance = tool(input_schema=input_schema, metadata=tool_metadata)
        # pass context_variables to agent functions
        try:
            raw_result = await tool_instance.arun()
            if hasattr(tool_instance.metadata, "token_consumption"):
                context_variables["usage_dict"][tool_call.call_id] = (
                    tool_instance.metadata.token_consumption
                )
        except Exception as err:
            return ResponseFunctionToolCallOutputItem(
                id=tool_call.id or "",
                call_id=tool_call.call_id,
                status="incomplete",
                output=str(err),
                type="function_call_output",
            ), None

        result: Result = self.handle_function_result(raw_result)
        return ResponseFunctionToolCallOutputItem(
            id=tool_call.id or "",
            call_id=tool_call.call_id,
            status="completed",
            output=result.value,
            type="function_call_output",
        ), result.agent

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
            metadata_data: list[dict[str, Any]] = []

            # If new message, create it. Else, HIL to we take the previous Assistant message.
            if messages[-1].entity == Entity.USER:
                new_message = Messages(
                    thread_id=messages[-1].thread_id,
                    entity=Entity.ASSISTANT,
                    parts=[],
                )
                yield f"data: {json.dumps({'type': 'start', 'messageId': f'msg_{uuid.uuid4().hex}'})}\n\n"
            else:
                new_message = messages[-1]
                await new_message.awaitable_attrs.token_consumption
                # Initialize metadata for previous HIL tool calls
                tool_map = {tool.name: tool for tool in active_agent.tools}
                metadata_data = get_previous_hil_metadata(new_message, tool_map)

            # MAIN AGENT LOOP
            while turns <= max_turns:
                # We need to redefine the tool map since the tools can change on agent switch.
                tool_map = {tool.name: tool for tool in active_agent.tools}

                # Force an AI message once max turns reached.
                # I.e. we do a total number of turns of max_turns + 1
                # The +1 being the final AI message.
                if turns == max_turns:
                    agent.tool_choice = "none"
                    agent.instructions = "You are a very nice assistant that is unable to further help the user due to rate limiting. The user just reached the maximum amount of turns he can take with you in a single query. Your one and only job is to let him know that in a nice way, and that the only way to continue the conversation is to send another message. Completely disregard his demand since you cannot fulfill it, simply state that he reached the limit."

                # get completion with current history, agent
                completion = await self.get_chat_completion(
                    agent=active_agent,
                    history=history,
                    context_variables=context_variables,
                    model_override=model_override,
                    stream=True,
                )

                turns += 1
                usage_data = None
                # for streaming interrupt and handling tool calls
                temp_stream_data: dict[str, Any] = {
                    "content": dict[str, ResponseOutputMessage](),
                    "tool_calls": dict[str, ResponseFunctionToolCall](),
                    "reasoning": dict[str, ResponseReasoningItem](),
                    "tool_to_execute": dict[str, ResponseFunctionToolCall](),
                }
                # Unpack the streaming events
                async for event in completion:
                    match event:
                        # === REASONING ===
                        # Reasoning starts
                        case ResponseOutputItemAddedEvent() if (
                            isinstance(event.item, ResponseReasoningItem)
                            and event.item.id
                        ):
                            temp_stream_data["reasoning"][event.item.id] = (
                                ResponseReasoningItem(
                                    id=event.item.id,
                                    summary=[],
                                    type="reasoning",
                                )
                            )

                        # Reasoning summary start
                        case ResponseReasoningSummaryPartAddedEvent():
                            temp_stream_data["reasoning"][event.item_id].summary.append(
                                {"text": "", "type": "summary_text"}
                            )
                            yield f"data: {json.dumps({'type': 'start-step'})}\n\n"
                            yield f"data: {json.dumps({'type': 'reasoning-start', 'id': event.item_id})}\n\n"

                        # Reasoning summary deltas
                        case ResponseReasoningSummaryTextDeltaEvent():
                            temp_stream_data["reasoning"][event.item_id].summary[-1][
                                "text"
                            ] += event.delta
                            yield f"data: {json.dumps({'type': 'reasoning-delta', 'id': event.item_id, 'delta': event.delta})}\n\n"

                        # Reasoning summary end
                        case ResponseReasoningSummaryPartDoneEvent():
                            yield f"data: {json.dumps({'type': 'reasoning-end', 'id': event.item_id})}\n\n"
                            yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                        # Capture the final reasoning (only chunk that has the encrypted content)
                        case ResponseOutputItemDoneEvent() if (
                            isinstance(event.item, ResponseReasoningItem)
                            and event.item.id
                        ):
                            append_part(
                                new_message, history, event.item, PartType.REASONING
                            )
                            temp_stream_data["reasoning"].pop(event.item.id, None)

                        # === TEXT ===
                        # Text message starts
                        case ResponseOutputItemAddedEvent() if (
                            isinstance(event.item, ResponseOutputMessage)
                            and event.item.id
                        ):
                            temp_stream_data["content"][event.item.id] = (
                                ResponseOutputMessage(
                                    id=event.item.id,
                                    content=[],
                                    role="assistant",
                                    status="in_progress",
                                    type="message",
                                )
                            )

                        # Text start
                        case ResponseContentPartAddedEvent():
                            temp_stream_data["content"][event.item_id].content.append(
                                {"text": "", "type": "output_text"}
                            )
                            yield f"data: {json.dumps({'type': 'text-start', 'id': event.item_id})}\n\n"

                        # Text Delta
                        case ResponseTextDeltaEvent():
                            temp_stream_data["content"][event.item_id].content[-1][
                                "text"
                            ] += event.delta
                            yield f"data: {json.dumps({'type': 'text-delta', 'id': event.item_id, 'delta': event.delta})}\n\n"

                        # Text end
                        case ResponseContentPartDoneEvent():
                            yield f"data: {json.dumps({'type': 'text-end', 'id': event.item_id})}\n\n"
                            yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                        # Capture the final content part
                        case ResponseOutputItemDoneEvent() if (
                            isinstance(event.item, ResponseOutputMessage)
                            and event.item.id
                        ):
                            append_part(
                                new_message, history, event.item, PartType.MESSAGE
                            )
                            temp_stream_data["content"].pop(event.item.id, None)

                        # === TOOL CALLS ===
                        # Tool call starts
                        case ResponseOutputItemAddedEvent() if (
                            isinstance(event.item, ResponseFunctionToolCall)
                            and event.item.id
                        ):
                            temp_stream_data["tool_calls"][event.item.id] = (
                                ResponseFunctionToolCall(
                                    id=event.item.id,
                                    call_id=event.item.call_id,
                                    name=event.item.name,
                                    arguments="",
                                    type="function_call",
                                    status="in_progress",
                                )
                            )
                            yield f"data: {json.dumps({'type': 'start-step'})}\n\n"
                            yield f"data: {json.dumps({'type': 'tool-input-start', 'toolCallId': event.item.id, 'toolName': event.item.name})}\n\n"

                        # Tool call (args) deltas
                        case ResponseFunctionCallArgumentsDeltaEvent() if event.item_id:
                            temp_stream_data["tool_calls"][
                                event.item_id
                            ].arguments += event.delta
                            yield f"data: {json.dumps({'type': 'tool-input-delta', 'toolCallId': event.item_id, 'inputTextDelta': event.delta})}\n\n"

                        # Tool call end and ready to execute
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
                            append_part(
                                new_message, history, event.item, PartType.FUNCTION_CALL
                            )
                            # Tool call ready --> remove from tool_calls, add to tool_to_execute
                            temp_stream_data["tool_calls"].pop(event.item.id, None)
                            temp_stream_data["tool_to_execute"][event.item.id] = (
                                event.item
                            )
                            yield f"data: {json.dumps({'type': 'tool-input-available', 'toolCallId': event.item.id, 'toolName': event.item.name, 'input': json.loads(args)})}\n\n"
                            yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                        # === Usage ===
                        # Handle usage/token information and ecrypted reasoning.
                        case ResponseCompletedEvent():
                            usage_data = event.response.usage

                        # case _:
                        #     print(event.type)
                        # Some events are not needed. Not sure what we should do with them yet.

                # Add the main LLM token usage
                new_message.token_consumption.extend(
                    get_main_LLM_token_consumption(
                        usage_data, agent.model, Task.CHAT_COMPLETION
                    )
                )

                # Separate streamed tool --> tool to execute / tool with HIL
                if temp_stream_data["tool_to_execute"]:
                    tool_calls_to_execute = [
                        tc
                        for tc in temp_stream_data["tool_to_execute"].values()
                        if not tool_map[tc.name].hil
                    ]
                    tool_calls_with_hil = [
                        tc
                        for tc in temp_stream_data["tool_to_execute"].values()
                        if tool_map[tc.name].hil
                    ]
                else:
                    # No tool calls, final content part reached, exit agent loop
                    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"
                    break

                # handle function calls, updating context_variables, and switching agents
                if tool_calls_to_execute:
                    tool_calls_done = await self.execute_tool_calls(
                        tool_calls_to_execute[:max_parallel_tool_calls],
                        active_agent.tools,
                        context_variables,
                    )
                    tool_calls_done.messages.extend(
                        [
                            ResponseFunctionToolCallOutputItem(
                                id=call.id,
                                call_id=call.call_id,
                                output=f"The tool {call.name} with arguments {call.arguments} could not be executed due to rate limit. Call it again.",
                                type="function_call_output",
                                status="incomplete",
                            )
                            for call in tool_calls_to_execute[max_parallel_tool_calls:]
                        ]
                    )
                else:
                    tool_calls_done = Response(
                        messages=[], agent=None, context_variables=context_variables
                    )

                # Process tool call outputs, adding token consumption and yielding outputs
                for tool_response in tool_calls_done.messages:
                    new_message.token_consumption.extend(
                        get_tool_token_consumption(tool_response, context_variables)
                    )
                    append_part(
                        new_message,
                        history,
                        tool_response,
                        PartType.FUNCTION_CALL_OUTPUT,
                    )
                    temp_stream_data["tool_to_execute"].pop(tool_response.id, None)
                    yield f"data: {json.dumps({'type': 'tool-output-available', 'toolCallId': tool_response.id, 'output': tool_response.output})}\n\n"

                yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"

                # If response contains HIL validation, do not update anything and return
                if tool_calls_with_hil:
                    for msg in tool_calls_with_hil:
                        metadata_data.append(
                            {
                                "toolCallId": msg.id,
                                "validated": "pending",
                                "isComplete": True,
                            }
                        )
                        temp_stream_data["tool_to_execute"].pop(msg.id, None)

                    yield f"data: {json.dumps({'type': 'finish-step'})}\n\n"
                    break

                # Update context variables, agent
                context_variables.update(tool_calls_done.context_variables)
                if tool_calls_done.agent:
                    active_agent = tool_calls_done.agent

            # End of agent loop. Add new message to DB.
            messages.append(new_message)
            if metadata_data:
                yield f"data: {json.dumps({'type': 'finish', 'messageMetadata': {'toolCalls': metadata_data}})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'finish'})}\n\n"
            yield "data: [DONE]\n\n"

        # User interrupts streaming
        except asyncio.exceptions.CancelledError:
            # add parts not appended to `new_message`
            if temp_stream_data["reasoning"]:
                for reasoning_item in temp_stream_data["reasoning"].values():
                    del reasoning_item.id
                    append_part(
                        new_message, history, reasoning_item, PartType.REASONING, False
                    )

            if temp_stream_data["content"]:
                for message_item in temp_stream_data["content"].values():
                    message_item.status = "incomplete"
                    append_part(
                        new_message, history, message_item, PartType.MESSAGE, False
                    )

            if temp_stream_data["tool_calls"]:
                for tool_call in temp_stream_data["tool_calls"].values():
                    tool_call.arguments = complete_partial_json(tool_call.arguments)
                    tool_call.status = "incomplete"
                    append_part(
                        new_message, history, tool_call, PartType.FUNCTION_CALL, False
                    )
                    append_part(
                        new_message,
                        history,
                        ResponseFunctionToolCallOutputItem(
                            id=tool_call.id,
                            call_id=tool_call.call_id,
                            output="Tool execution aborted by the user.",
                            type="function_call_output",
                            status="incomplete",
                        ),
                        PartType.FUNCTION_CALL_OUTPUT,
                        False,
                    )

            if temp_stream_data["tool_to_execute"]:
                for tool_call in temp_stream_data["tool_to_execute"].values():
                    append_part(
                        new_message,
                        history,
                        ResponseFunctionToolCallOutputItem(
                            id=tool_call.id,
                            call_id=tool_call.call_id,
                            output="Tool execution aborted by the user.",
                            type="function_call_output",
                            status="incomplete",
                        ),
                        PartType.FUNCTION_CALL_OUTPUT,
                        False,
                    )

            # Append completed new_message to DB
            messages.append(new_message)
