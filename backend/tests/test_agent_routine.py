import json
from unittest.mock import patch

import pytest
from openai.types.responses import (
    FunctionTool,
    ResponseCompletedEvent,
    ResponseContentPartAddedEvent,
    ResponseContentPartDoneEvent,
    ResponseFunctionCallArgumentsDeltaEvent,
    ResponseFunctionToolCall,
    ResponseOutputItemAddedEvent,
    ResponseOutputItemDoneEvent,
    ResponseOutputMessage,
    ResponseOutputText,
    ResponseReasoningSummaryPartAddedEvent,
    ResponseReasoningSummaryPartDoneEvent,
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseTextDeltaEvent,
    ResponseUsage,
)
from openai.types.responses import (
    Response as OpenAIResponse,
)
from pydantic import BaseModel

from neuroagent.agent_routine import AgentsRoutine
from neuroagent.app.database.sql_schemas import Entity, Messages, ToolCalls
from neuroagent.new_types import Agent, Response, Result
from tests.mock_client import create_mock_response


class TestAgentsRoutine:
    @pytest.mark.asyncio
    async def test_get_chat_completion_simple_message(self, mock_openai_client):
        routine = AgentsRoutine(client=mock_openai_client)

        agent = Agent()
        response = await routine.get_chat_completion(
            agent=agent,
            history=[{"role": "user", "content": "Hello !"}],
            context_variables={},
            model_override=None,
        )

        mock_openai_client.assert_responses_create_called_with(
            **{
                "instructions": "You are a helpful agent.",
                "input": [{"role": "user", "content": "Hello !"}],
                "model": "openai/gpt-5-mini",
                "stream": False,
                "temperature": 0,
                "tools": [],
                "include": ["reasoning.encrypted_content"],
                "store": False,
            }
        )
        assert response.output[0]["role"] == "assistant"
        assert response.output[0]["content"] == [
            {"type": "output_text", "text": "sample response content"}
        ]

    @pytest.mark.asyncio
    async def test_get_chat_completion_callable_sys_prompt(self, mock_openai_client):
        routine = AgentsRoutine(client=mock_openai_client)

        def agent_instruction(context_variables):
            twng = context_variables.get("twng")
            mrt = context_variables.get("mrt")
            return f"This is your new instructions with {twng} and {mrt}."

        agent = Agent(instructions=agent_instruction)
        response = await routine.get_chat_completion(
            agent=agent,
            history=[{"role": "user", "content": "Hello !"}],
            context_variables={"mrt": "Great mrt", "twng": "Bad twng"},
            model_override=None,
        )
        mock_openai_client.assert_responses_create_called_with(
            **{
                "instructions": "This is your new instructions with Bad twng and Great mrt.",
                "input": [{"role": "user", "content": "Hello !"}],
                "model": "openai/gpt-5-mini",
                "stream": False,
                "temperature": 0,
                "tools": [],
                "include": ["reasoning.encrypted_content"],
                "store": False,
            }
        )
        assert response.output[0]["role"] == "assistant"
        assert response.output[0]["content"] == [
            {"type": "output_text", "text": "sample response content"}
        ]

    @pytest.mark.asyncio
    async def test_get_chat_completion_tools(
        self, mock_openai_client, get_weather_tool
    ):
        routine = AgentsRoutine(client=mock_openai_client)

        agent = Agent(tools=[get_weather_tool])
        response = await routine.get_chat_completion(
            agent=agent,
            history=[{"role": "user", "content": "Hello !"}],
            context_variables={},
            model_override=None,
        )
        mock_openai_client.assert_responses_create_called_with(
            **{
                "instructions": "You are a helpful agent.",
                "input": [{"role": "user", "content": "Hello !"}],
                "model": "openai/gpt-5-mini",
                "stream": False,
                "temperature": 0,
                "tools": [
                    {
                        "type": "function",
                        "name": "get_weather",
                        "description": "Great description",
                        "parameters": {
                            "properties": {
                                "location": {
                                    "description": "The location to get the weather for",
                                    "title": "Location",
                                    "type": "string",
                                }
                            },
                            "required": ["location"],
                            "title": "FakeToolInput",
                            "type": "object",
                            "additionalProperties": False,
                        },
                    }
                ],
                "include": ["reasoning.encrypted_content"],
                "store": False,
                "parallel_tool_calls": True,
            }
        )

        assert response.output[0]["role"] == "assistant"
        assert response.output[0]["content"] == [
            {"type": "output_text", "text": "sample response content"}
        ]

    def test_handle_function_result(self, mock_openai_client):
        routine = AgentsRoutine(client=mock_openai_client)

        # Raw result is already a result
        raw_result = Result(value="Nice weather")
        result = routine.handle_function_result(raw_result)
        assert result == raw_result

        # Raw result is an agent for handoff
        raw_result = Agent(name="Test agent 2")
        result = routine.handle_function_result(raw_result)
        assert result == Result(
            value=json.dumps({"assistant": raw_result.name}), agent=raw_result
        )

        # Raw result is a tool output (BaseModel)
        class FakeOutput(BaseModel):
            result_1: str
            result_2: str

        raw_result = FakeOutput(result_1="Great result", result_2="Bad result")

        result = routine.handle_function_result(raw_result)
        assert result == Result(value=raw_result.model_dump_json())

        # Errors
        with pytest.raises(TypeError):
            routine.handle_function_result(["123"])
        with pytest.raises(TypeError):
            routine.handle_function_result(
                [
                    FakeOutput(result_1="Great result", result_2="Bad result"),
                    FakeOutput(result_1="ads", result_2="test"),
                ]
            )

    @pytest.mark.asyncio
    async def test_execute_tool_calls_simple(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        routine = AgentsRoutine(client=mock_openai_client)

        mock_openai_client.set_response(
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[
                    {"name": "get_weather", "args": {"location": "Geneva"}}
                ],
            ),
        )
        agent = Agent(tools=[get_weather_tool, agent_handoff_tool])
        context_variables = {}

        tool_call_message = await routine.get_chat_completion(
            agent,
            history=[{"role": "user", "content": "Hello"}],
            context_variables=context_variables,
            model_override=None,
        )
        tool_calls = tool_call_message.output
        tool_calls_db = [
            ToolCalls(
                tool_call_id=tool_call.id,
                name=tool_call.name,
                arguments=tool_call.arguments,
            )
            for tool_call in tool_calls
        ]
        tool_calls_result = await routine.execute_tool_calls(
            tool_calls=tool_calls_db,
            tools=agent.tools,
            context_variables=context_variables,
        )
        assert isinstance(tool_calls_result, Response)
        assert tool_calls_result.messages == [
            {
                "role": "tool",
                "tool_call_id": tool_calls[0].id,
                "tool_name": "get_weather",
                "content": '{"output":{"param":"It\'s sunny today."}}',
            }
        ]
        assert tool_calls_result.agent is None
        assert tool_calls_result.context_variables == context_variables

    @pytest.mark.asyncio
    async def test_execute_multiple_tool_calls(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        routine = AgentsRoutine(client=mock_openai_client)

        mock_openai_client.set_response(
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[
                    {"name": "get_weather", "args": {"location": "Geneva"}},
                    {"name": "get_weather", "args": {"location": "Lausanne"}},
                ],
            ),
        )
        agent = Agent(tools=[get_weather_tool, agent_handoff_tool])
        context_variables = {"planet": "Earth"}

        tool_call_message = await routine.get_chat_completion(
            agent,
            history=[{"role": "user", "content": "Hello"}],
            context_variables=context_variables,
            model_override=None,
        )
        tool_calls = tool_call_message.output
        tool_calls_db = [
            ToolCalls(
                tool_call_id=tool_call.id,
                name=tool_call.name,
                arguments=tool_call.arguments,
            )
            for tool_call in tool_calls
        ]
        tool_calls_result = await routine.execute_tool_calls(
            tool_calls=tool_calls_db,
            tools=agent.tools,
            context_variables=context_variables,
        )

        assert isinstance(tool_calls_result, Response)
        assert tool_calls_result.messages == [
            {
                "role": "tool",
                "tool_call_id": tool_calls[0].id,
                "tool_name": "get_weather",
                "content": '{"output":{"param":"It\'s sunny today in Geneva from planet Earth."}}',
            },
            {
                "role": "tool",
                "tool_call_id": tool_calls[1].id,
                "tool_name": "get_weather",
                "content": '{"output":{"param":"It\'s sunny today in Lausanne from planet Earth."}}',
            },
        ]
        assert tool_calls_result.agent is None
        assert tool_calls_result.context_variables == context_variables

    @pytest.mark.asyncio
    async def test_execute_tool_calls_handoff(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        routine = AgentsRoutine(client=mock_openai_client)

        mock_openai_client.set_response(
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[{"name": "agent_handoff_tool", "args": {}}],
            ),
        )
        agent_1 = Agent(name="Test agent 1", tools=[agent_handoff_tool])
        agent_2 = Agent(
            name="Test agent 2", tools=[get_weather_tool, agent_handoff_tool]
        )
        context_variables = {"to_agent": agent_2}

        tool_call_message = await routine.get_chat_completion(
            agent_1,
            history=[{"role": "user", "content": "Hello"}],
            context_variables=context_variables,
            model_override=None,
        )
        tool_calls = tool_call_message.output
        tool_calls_db = [
            ToolCalls(
                tool_call_id=tool_call.id,
                name=tool_call.name,
                arguments=tool_call.arguments,
            )
            for tool_call in tool_calls
        ]
        tool_calls_result = await routine.execute_tool_calls(
            tool_calls=tool_calls_db,
            tools=agent_1.tools,
            context_variables=context_variables,
        )

        assert isinstance(tool_calls_result, Response)
        assert tool_calls_result.messages == [
            {
                "role": "tool",
                "tool_call_id": tool_calls[0].id,
                "tool_name": "agent_handoff_tool",
                "content": json.dumps({"assistant": agent_2.name}),
            }
        ]
        assert tool_calls_result.agent == agent_2
        assert tool_calls_result.context_variables == context_variables

    @pytest.mark.asyncio
    async def test_handle_tool_call_simple(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        routine = AgentsRoutine(client=mock_openai_client)

        mock_openai_client.set_response(
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[
                    {"name": "get_weather", "args": {"location": "Geneva"}}
                ],
            ),
        )
        agent = Agent(tools=[get_weather_tool, agent_handoff_tool])
        context_variables = {}

        tool_call_message = await routine.get_chat_completion(
            agent,
            history=[{"role": "user", "content": "Hello"}],
            context_variables=context_variables,
            model_override=None,
        )
        tool_call = tool_call_message.output[0]
        tool_call_db = ToolCalls(
            tool_call_id=tool_call.id,
            name=tool_call.name,
            arguments=tool_call.arguments,
        )
        tool_call_result = await routine.handle_tool_call(
            tool_call=tool_call_db,
            tools=agent.tools,
            context_variables=context_variables,
        )

        assert tool_call_result == (
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "tool_name": "get_weather",
                "content": '{"output":{"param":"It\'s sunny today."}}',
            },
            None,
        )

    @pytest.mark.asyncio
    async def test_handle_tool_call_context_var(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        routine = AgentsRoutine(client=mock_openai_client)

        mock_openai_client.set_response(
            create_mock_response(
                message={"role": "assistant", "content": ""},
                function_calls=[
                    {"name": "get_weather", "args": {"location": "Geneva"}},
                ],
            ),
        )
        agent = Agent(tools=[get_weather_tool, agent_handoff_tool])
        context_variables = {"planet": "Earth"}

        tool_call_message = await routine.get_chat_completion(
            agent,
            history=[{"role": "user", "content": "Hello"}],
            context_variables=context_variables,
            model_override=None,
        )
        tool_call = tool_call_message.output[0]
        tool_call_db = ToolCalls(
            tool_call_id=tool_call.id,
            name=tool_call.name,
            arguments=tool_call.arguments,
        )
        tool_calls_result = await routine.handle_tool_call(
            tool_call=tool_call_db,
            tools=agent.tools,
            context_variables=context_variables,
        )

        assert tool_calls_result == (
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "tool_name": "get_weather",
                "content": '{"output":{"param":"It\'s sunny today in Geneva from planet Earth."}}',
            },
            None,
        )

    @pytest.mark.asyncio
    async def test_astream_complete_flow(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        """Test complete astream flow with agent handoff, tool execution, and text response using Response API."""

        # Setup agents
        agent_1 = Agent(name="Agent 1", tools=[agent_handoff_tool])
        agent_2 = Agent(name="Agent 2", tools=[get_weather_tool])

        # Initial user message
        messages = [
            Messages(
                thread_id="test_thread_123",
                entity=Entity.USER,
                content=json.dumps(
                    {
                        "role": "user",
                        "content": "What's the weather like in San Francisco?",
                    }
                ),
            )
        ]

        context_variables = {"to_agent": agent_2, "planet": "Earth", "usage_dict": {}}
        routine = AgentsRoutine(client=mock_openai_client)

        async def mock_streaming_completion(*args, **kwargs):
            """Mock streaming responses for different turns using Response API format."""
            history = kwargs["history"]

            # Count non-tool messages to determine which turn we're on
            turn = len(history)

            # Turn 1: Agent handoff
            if turn == 1:
                # Function call added
                yield ResponseOutputItemAddedEvent(
                    type="response.output_item.added",
                    output_index=0,
                    sequence_number=0,
                    item=ResponseFunctionToolCall(
                        id="tc_handoff_123",
                        call_id="tc_random_id_1",
                        type="function_call",
                        name="agent_handoff_tool",
                        arguments="",
                        status="in_progress",
                    ),
                )

                # Function arguments delta
                yield ResponseFunctionCallArgumentsDeltaEvent(
                    output_index=1,
                    sequence_number=1,
                    type="response.function_call_arguments.delta",
                    item_id="tc_handoff_123",
                    delta="{}",
                )

                # Function call done
                yield ResponseOutputItemDoneEvent(
                    type="response.output_item.done",
                    output_index=2,
                    sequence_number=2,
                    item=ResponseFunctionToolCall(
                        id="tc_handoff_123",
                        call_id="tc_random_id_1",
                        type="function_call",
                        name="agent_handoff_tool",
                        arguments="{}",
                        status="completed",
                    ),
                )

                yield ResponseCompletedEvent(
                    output_index=3,
                    sequence_number=3,
                    type="response.completed",
                    event_id="event_4",
                    response=OpenAIResponse(
                        id="resp_1",
                        created_at=1234567890,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=False,
                        tool_choice="auto",
                        tools=[
                            FunctionTool(
                                type="function",
                                name="agent_handoff_tool",
                                parameters={"to_agent": Agent},
                            )
                        ],
                        output=[
                            ResponseFunctionToolCall(
                                id="tc_handoff_123",
                                call_id="tc_random_id_1",
                                type="function_call",
                                name="agent_handoff_tool",
                                arguments="{}",
                                status="completed",
                            )
                        ],
                        usage=ResponseUsage(
                            input_tokens=50,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=10,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=60,
                        ),
                    ),
                )

            # Turn 2: Weather tool call
            elif turn == 3:
                # Function call added
                yield ResponseOutputItemAddedEvent(
                    type="response.output_item.added",
                    output_index=4,
                    sequence_number=4,
                    item=ResponseFunctionToolCall(
                        id="tc_weather_456",
                        type="function_call",
                        call_id="tc_random_id_2",
                        name="get_weather",
                        arguments="",
                        status="in_progress",
                    ),
                )

                # Function arguments deltas
                yield ResponseFunctionCallArgumentsDeltaEvent(
                    output_index=5,
                    sequence_number=5,
                    type="response.function_call_arguments.delta",
                    event_id="event_6",
                    item_id="tc_weather_456",
                    delta='{"location"',
                )

                yield ResponseFunctionCallArgumentsDeltaEvent(
                    output_index=6,
                    sequence_number=6,
                    type="response.function_call_arguments.delta",
                    event_id="event_7",
                    item_id="tc_weather_456",
                    delta=': "San Francisco"}',
                )

                # Function call done
                yield ResponseOutputItemDoneEvent(
                    type="response.output_item.done",
                    output_index=7,
                    sequence_number=7,
                    item=ResponseFunctionToolCall(
                        id="tc_weather_456",
                        call_id="tc_random_id_2",
                        type="function_call",
                        name="get_weather",
                        arguments='{"location": "San Francisco"}',
                        status="completed",
                    ),
                )

                yield ResponseCompletedEvent(
                    output_index=8,
                    sequence_number=8,
                    type="response.completed",
                    event_id="event_6",
                    response=OpenAIResponse(
                        id="resp_2",
                        created_at=1234567890,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=False,
                        tool_choice="auto",
                        tools=[
                            FunctionTool(
                                type="function",
                                name="get_weather_tool",
                                parameters={"planet": str},
                            )
                        ],
                        output=[
                            ResponseFunctionToolCall(
                                id="tc_weather_456",
                                type="function_call",
                                call_id="tc_random_id_2",
                                name="get_weather",
                                arguments='{"location": "San Francisco"}',
                                status="completed",
                            )
                        ],
                        usage=ResponseUsage(
                            input_tokens=80,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=80,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=95,
                        ),
                    ),
                )

            # Turn 3: Final text response
            elif turn == 5:
                # Content part added
                yield ResponseContentPartAddedEvent(
                    output_index=9,
                    sequence_number=9,
                    type="response.content_part.added",
                    event_id="event_10",
                    item_id="item_text_789",
                    content_index=42,
                    part=ResponseOutputText(
                        type="output_text", text="", annotations=[]
                    ),
                )

                # Text deltas
                text_chunks = ["The weather ", "in San Francisco ", "is sunny today!"]
                for i, chunk_text in enumerate(text_chunks):
                    yield ResponseTextDeltaEvent(
                        type="response.output_text.delta",
                        event_id=f"event_{10 + i}",
                        item_id="item_text_789",
                        logprobs=[],
                        sequence_number=10 + i,
                        output_index=10 + i,
                        content_index=42,
                        delta=chunk_text,
                    )

                # Content part done
                yield ResponseContentPartDoneEvent(
                    type="response.content_part.done",
                    event_id="event_13",
                    item_id="item_text_789",
                    sequence_number=13,
                    output_index=13,
                    content_index=42,
                    part=ResponseOutputText(
                        type="output_text",
                        text="The weather in San Francisco is sunny today!",
                        annotations=[],
                    ),
                )

                yield ResponseCompletedEvent(
                    output_index=14,
                    sequence_number=14,
                    type="response.completed",
                    event_id="event_9",
                    response=OpenAIResponse(
                        id="resp_3",
                        created_at=1234567890,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=False,
                        tool_choice="auto",
                        tools=[
                            FunctionTool(
                                type="function",
                                name="get_weather_tool",
                                parameters={"planet": str},
                            )
                        ],
                        output=[
                            ResponseOutputMessage(
                                id="item_text_789",
                                type="message",
                                role="assistant",
                                status="completed",
                                content=[
                                    ResponseOutputText(
                                        type="output_text",
                                        text="The weather in San Francisco is sunny today!",
                                        annotations=[],
                                    )
                                ],
                            )
                        ],
                        usage=ResponseUsage(
                            input_tokens=100,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=20,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=120,
                        ),
                    ),
                )

        # Collect all streamed events
        events = []

        with patch(
            "neuroagent.agent_routine.AgentsRoutine.get_chat_completion",
            side_effect=mock_streaming_completion,
        ):
            async for event in routine.astream(
                agent=agent_1,
                messages=messages,
                context_variables=context_variables,
            ):
                events.append(event)

        # Parse SSE events
        parsed_events = []
        for event in events:
            if event.startswith("data: ") and event != "data: [DONE]\n\n":
                data = event.replace("data: ", "").strip()
                try:
                    parsed_events.append(json.loads(data))
                except json.JSONDecodeError:
                    pass

        # Verify event sequence
        event_types = [e["type"] for e in parsed_events]

        # Expected flow for Response API:
        # 1. start (initial message)
        # 2. start-step + tool-input-start (handoff tool)
        # 3. tool-input-available (handoff tool complete)
        # 4. finish-step
        # 5. tool-output-available (handoff result)
        # 6. finish-step
        # 7. start-step + tool-input-start (weather tool)
        # 8. tool-input-delta (weather args streaming)
        # 9. tool-input-available (weather tool complete)
        # 10. finish-step
        # 11. tool-output-available (weather result)
        # 12. finish-step
        # 13. text-start
        # 14. text-delta (multiple)
        # 15. text-end
        # 16. finish-step (twice - once after text-end, once before finish)
        # 17. finish

        assert "start" in event_types
        assert event_types.count("start-step") == 2  # handoff + weather
        assert event_types.count("tool-input-start") == 2  # handoff + weather
        assert event_types.count("tool-input-available") == 2
        assert event_types.count("tool-output-available") == 2
        assert event_types.count("finish-step") >= 3  # after each turn
        assert "text-start" in event_types
        assert event_types.count("text-delta") >= 1
        assert "text-end" in event_types
        assert "finish" in event_types

        # Verify tool calls
        tool_input_events = [
            e for e in parsed_events if e["type"] == "tool-input-available"
        ]
        assert len(tool_input_events) == 2
        assert tool_input_events[0]["toolName"] == "agent_handoff_tool"
        assert tool_input_events[1]["toolName"] == "get_weather"
        assert tool_input_events[1]["input"]["location"] == "San Francisco"

        # Verify tool outputs
        tool_output_events = [
            e for e in parsed_events if e["type"] == "tool-output-available"
        ]
        assert len(tool_output_events) == 2

        # First output should be agent handoff
        handoff_output = json.loads(tool_output_events[0]["output"])
        assert handoff_output["assistant"] == agent_2.name

        # Second output should be weather result
        weather_output = tool_output_events[1]["output"]
        assert "San Francisco" in weather_output
        assert "Earth" in weather_output  # Uses context variable

        # Verify text deltas
        text_deltas = [e["delta"] for e in parsed_events if e["type"] == "text-delta"]
        full_text = "".join(text_deltas)
        assert full_text == "The weather in San Francisco is sunny today!"

        # Verify final message state
        assert len(messages) > 1  # Original + new messages

        # Check that messages were properly recorded
        ai_messages = [
            m for m in messages if m.entity in [Entity.AI_MESSAGE, Entity.AI_TOOL]
        ]
        tool_messages = [m for m in messages if m.entity == Entity.TOOL]

        assert len(ai_messages) == 3  # handoff call, weather call, final response
        assert len(tool_messages) == 2  # handoff result, weather result

        # Verify final assistant message has the complete text
        final_message = json.loads(messages[-1].content)
        assert final_message["role"] == "assistant"
        assert (
            final_message["content"] == "The weather in San Francisco is sunny today!"
        )

        # Verify token consumption was tracked
        assert any(m.token_consumption for m in messages)

    @pytest.mark.asyncio
    async def test_astream_max_turns_limit(self, mock_openai_client, get_weather_tool):
        """Test that max_turns limit is enforced."""
        agent = Agent(name="Test Agent", tools=[get_weather_tool])
        messages = [
            Messages(
                thread_id="test_thread",
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": "Test"}),
            )
        ]
        context_variables = {"usage_dict": {}}

        async def mock_tool_calls(*args, **kwargs):
            """Always return tool calls to trigger max turns."""
            history = kwargs["history"]
            turn = len(history)

            if turn == 1:
                yield ResponseOutputItemAddedEvent(
                    type="response.output_item.added",
                    output_index=0,
                    sequence_number=0,
                    item=ResponseFunctionToolCall(
                        id="tc_123",
                        call_id="tc_random_1",
                        type="function_call",
                        name="get_weather",
                        arguments='{"location": "NYC"}',
                        status="in_progress",
                    ),
                )

                yield ResponseOutputItemDoneEvent(
                    type="response.output_item.done",
                    output_index=1,
                    sequence_number=1,
                    item=ResponseFunctionToolCall(
                        id="tc_123",
                        call_id="tc_random_1",
                        type="function_call",
                        name="get_weather",
                        arguments='{"location": "NYC"}',
                        status="completed",
                    ),
                )

                yield ResponseCompletedEvent(
                    output_index=2,
                    sequence_number=2,
                    type="response.completed",
                    event_id="event_1",
                    response=OpenAIResponse(
                        id="resp_1",
                        created_at=1234567890,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=False,
                        tool_choice="auto",
                        tools=[],
                        output=[
                            ResponseFunctionToolCall(
                                id="tc_123",
                                call_id="tc_random_1",
                                type="function_call",
                                name="get_weather",
                                arguments='{"location": "NYC"}',
                                status="completed",
                            )
                        ],
                        usage=ResponseUsage(
                            input_tokens=50,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=10,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=60,
                        ),
                    ),
                )

            elif turn == 3:
                yield ResponseContentPartAddedEvent(
                    output_index=3,
                    sequence_number=3,
                    type="response.content_part.added",
                    event_id="event_2",
                    item_id="item_text_1",
                    content_index=0,
                    part=ResponseOutputText(
                        type="output_text", text="", annotations=[]
                    ),
                )

                text_chunks = ["The weather ", "in San Francisco ", "is sunny today!"]
                for i, chunk_text in enumerate(text_chunks):
                    yield ResponseTextDeltaEvent(
                        type="response.output_text.delta",
                        event_id=f"event_{4 + i}",
                        item_id="item_text_1",
                        logprobs=[],
                        sequence_number=4 + i,
                        output_index=4 + i,
                        content_index=0,
                        delta=chunk_text,
                    )

                yield ResponseContentPartDoneEvent(
                    type="response.content_part.done",
                    event_id="event_7",
                    item_id="item_text_1",
                    sequence_number=7,
                    output_index=7,
                    content_index=0,
                    part=ResponseOutputText(
                        type="output_text",
                        text="The weather in San Francisco is sunny today!",
                        annotations=[],
                    ),
                )

                yield ResponseCompletedEvent(
                    output_index=8,
                    sequence_number=8,
                    type="response.completed",
                    event_id="event_8",
                    response=OpenAIResponse(
                        id="resp_2",
                        created_at=1234567892,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=False,
                        tool_choice="auto",
                        tools=[],
                        output=[
                            ResponseOutputMessage(
                                id="item_text_1",
                                type="message",
                                role="assistant",
                                status="completed",
                                content=[
                                    ResponseOutputText(
                                        type="output_text",
                                        text="The weather in San Francisco is sunny today!",
                                        annotations=[],
                                    )
                                ],
                            )
                        ],
                        usage=ResponseUsage(
                            input_tokens=100,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=20,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=120,
                        ),
                    ),
                )

        routine = AgentsRoutine(client=mock_openai_client)
        events = []

        with patch(
            "neuroagent.agent_routine.AgentsRoutine.get_chat_completion",
            side_effect=mock_tool_calls,
        ):
            async for event in routine.astream(
                agent=agent,
                messages=messages,
                context_variables=context_variables,
                max_turns=2,
            ):
                events.append(event)

        parsed_events = []
        for event in events:
            if event.startswith("data: ") and event != "data: [DONE]\n\n":
                data = event.replace("data: ", "").strip()
                try:
                    parsed_events.append(json.loads(data))
                except json.JSONDecodeError:
                    pass

        event_types = [e["type"] for e in parsed_events]
        assert "text-delta" in event_types or "text-start" in event_types

    @pytest.mark.asyncio
    async def test_astream_with_reasoning(self, mock_openai_client):
        """Test streaming with reasoning tokens (for o1-style models)."""
        agent = Agent(name="Reasoning Agent", tools=[], model="gpt-5-mini")
        messages = [
            Messages(
                thread_id="test_thread",
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": "Solve this problem"}),
            )
        ]
        context_variables = {"usage_dict": {}}

        async def mock_reasoning_response(*args, **kwargs):
            """Mock response with reasoning tokens."""
            yield ResponseReasoningSummaryPartAddedEvent(
                type="response.reasoning_summary_part.added",
                event_id="event_1",
                item_id="item_reason_1",
                output_index=0,
                content_index=0,
                sequence_number=0,
                summary_index=42,
                part={"type": "summary_text", "text": ""},
            )

            reasoning_parts = ["Let me think", " about this", " carefully"]
            for i, part in enumerate(reasoning_parts):
                yield ResponseReasoningSummaryTextDeltaEvent(
                    type="response.reasoning_summary_text.delta",
                    event_id=f"event_{2 + i}",
                    item_id="item_reason_1",
                    output_index=42,
                    sequence_number=i + 1,
                    content_index=0,
                    summary_index=42,
                    delta=part,
                )

            yield ResponseReasoningSummaryPartDoneEvent(
                type="response.reasoning_summary_part.done",
                event_id="event_5",
                item_id="item_reason_1",
                output_index=3,
                content_index=0,
                sequence_number=4,
                summary_index=42,
                part={
                    "type": "summary_text",
                    "text": "Let me think about this carefully",
                },
            )

            yield ResponseContentPartAddedEvent(
                output_index=4,
                sequence_number=6,
                type="response.content_part.added",
                event_id="event_6",
                item_id="item_text_1",
                content_index=0,
                part=ResponseOutputText(type="output_text", text="", annotations=[]),
            )

            yield ResponseTextDeltaEvent(
                type="response.output_text.delta",
                event_id="event_7",
                item_id="item_text_1",
                logprobs=[],
                sequence_number=7,
                output_index=5,
                content_index=0,
                delta="Here's the solution",
            )

            yield ResponseContentPartDoneEvent(
                type="response.content_part.done",
                event_id="event_8",
                item_id="item_text_1",
                sequence_number=8,
                output_index=6,
                content_index=0,
                part=ResponseOutputText(
                    type="output_text", text="Here's the solution", annotations=[]
                ),
            )

            yield ResponseCompletedEvent(
                output_index=7,
                sequence_number=9,
                type="response.completed",
                event_id="event_9",
                response=OpenAIResponse(
                    id="resp_1",
                    created_at=1234567890,
                    status="completed",
                    model="gpt-5-mini",
                    object="response",
                    parallel_tool_calls=False,
                    tool_choice="auto",
                    tools=[],
                    output=[
                        ResponseOutputMessage(
                            id="item_text_1",
                            type="message",
                            role="assistant",
                            status="completed",
                            content=[
                                ResponseOutputText(
                                    type="output_text",
                                    text="Here's the solution",
                                    annotations=[],
                                )
                            ],
                        )
                    ],
                    usage=ResponseUsage(
                        input_tokens=10,
                        input_tokens_details={"cached_tokens": 0},
                        output_tokens=20,
                        output_tokens_details={"reasoning_tokens": 0},
                        total_tokens=30,
                    ),
                ),
            )

        routine = AgentsRoutine(client=mock_openai_client)
        events = []

        with patch(
            "neuroagent.agent_routine.AgentsRoutine.get_chat_completion",
            side_effect=mock_reasoning_response,
        ):
            async for event in routine.astream(
                agent=agent,
                messages=messages,
                context_variables=context_variables,
            ):
                events.append(event)

        parsed_events = []
        for event in events:
            if event.startswith("data: ") and event != "data: [DONE]\n\n":
                data = event.replace("data: ", "").strip()
                try:
                    parsed_events.append(json.loads(data))
                except json.JSONDecodeError:
                    pass

        event_types = [e["type"] for e in parsed_events]
        assert "reasoning-start" in event_types
        assert "reasoning-delta" in event_types
        assert "reasoning-end" in event_types

        reasoning_deltas = [
            e["delta"] for e in parsed_events if e["type"] == "reasoning-delta"
        ]
        full_reasoning = "".join(reasoning_deltas)
        assert "Let me think about this carefully" == full_reasoning

    @pytest.mark.asyncio
    async def test_astream_hil_tool_validation(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        """Test Human-in-the-Loop tool validation."""
        get_weather_tool.hil = True
        agent = Agent(name="Test Agent", tools=[get_weather_tool])
        messages = [
            Messages(
                thread_id="test_thread",
                entity=Entity.USER,
                content=json.dumps({"role": "user", "content": "Weather check"}),
            )
        ]
        context_variables = {"usage_dict": {}}

        async def mock_tool_call(*args, **kwargs):
            """Mock a tool call."""
            yield ResponseOutputItemAddedEvent(
                type="response.output_item.added",
                output_index=0,
                sequence_number=0,
                item=ResponseFunctionToolCall(
                    id="tc_hil",
                    call_id="tc_random_hil",
                    type="function_call",
                    name="get_weather",
                    arguments='{"location": "Paris"}',
                    status="in_progress",
                ),
            )

            yield ResponseOutputItemDoneEvent(
                type="response.output_item.done",
                output_index=1,
                sequence_number=1,
                item=ResponseFunctionToolCall(
                    id="tc_hil",
                    call_id="tc_random_hil",
                    type="function_call",
                    name="get_weather",
                    arguments='{"location": "Paris"}',
                    status="completed",
                ),
            )

            yield ResponseCompletedEvent(
                output_index=2,
                sequence_number=2,
                type="response.completed",
                event_id="event_1",
                response=OpenAIResponse(
                    id="resp_1",
                    created_at=1234567890,
                    status="completed",
                    model="gpt-5-mini",
                    object="response",
                    parallel_tool_calls=False,
                    tool_choice="auto",
                    tools=[],
                    output=[
                        ResponseFunctionToolCall(
                            id="tc_hil",
                            call_id="tc_random_hil",
                            type="function_call",
                            name="get_weather",
                            arguments='{"location": "Paris"}',
                            status="completed",
                        )
                    ],
                    usage=ResponseUsage(
                        input_tokens=50,
                        input_tokens_details={"cached_tokens": 0},
                        output_tokens=10,
                        output_tokens_details={"reasoning_tokens": 0},
                        total_tokens=60,
                    ),
                ),
            )

        routine = AgentsRoutine(client=mock_openai_client)
        events = []

        with patch(
            "neuroagent.agent_routine.AgentsRoutine.get_chat_completion",
            side_effect=mock_tool_call,
        ):
            async for event in routine.astream(
                agent=agent,
                messages=messages,
                context_variables=context_variables,
            ):
                events.append(event)

        parsed_events = []
        for event in events:
            if event.startswith("data: ") and event != "data: [DONE]\n\n":
                data = event.replace("data: ", "").strip()
                try:
                    parsed_events.append(json.loads(data))
                except json.JSONDecodeError:
                    pass

        finish_events = [e for e in parsed_events if e["type"] == "finish"]
        assert len(finish_events) == 1
        finish_event = finish_events[0]
        assert "messageMetadata" in finish_event
        assert "toolCalls" in finish_event["messageMetadata"]
        hil_data = finish_event["messageMetadata"]["toolCalls"]
        assert len(hil_data) == 1
        assert hil_data[0]["validated"] == "pending"

    @pytest.mark.asyncio
    async def test_astream_parallel_tool_call_limit(
        self, mock_openai_client, get_weather_tool
    ):
        """Test that parallel tool calls are limited."""

        agent = Agent(
            name="Test Agent", tools=[get_weather_tool], parallel_tool_calls=True
        )
        messages = [
            Messages(
                thread_id="test_thread",
                entity=Entity.USER,
                content=json.dumps(
                    {"role": "user", "content": "Check multiple cities"}
                ),
            )
        ]
        context_variables = {"usage_dict": {}}

        async def mock_multiple_tool_calls(*args, **kwargs):
            """Mock multiple parallel tool calls."""
            history = kwargs["history"]
            turn = len(history)

            if turn == 1:
                # First chunk with tool call start
                for i in range(3):  # 3 tool calls
                    yield ResponseOutputItemAddedEvent(
                        type="response.output_item.added",
                        output_index=i,
                        sequence_number=i,
                        item=ResponseFunctionToolCall(
                            id=f"tc_{i}",
                            call_id=f"tc_random_{i}",
                            type="function_call",
                            name="get_weather",
                            arguments="",
                            status="in_progress",
                        ),
                    )

                    yield ResponseFunctionCallArgumentsDeltaEvent(
                        output_index=i + 3,
                        sequence_number=i + 3,
                        type="response.function_call_arguments.delta",
                        item_id=f"tc_{i}",
                        delta=f'{{"location": "City{i}"}}',
                    )

                    yield ResponseOutputItemDoneEvent(
                        type="response.output_item.done",
                        output_index=i + 6,
                        sequence_number=i + 6,
                        item=ResponseFunctionToolCall(
                            id=f"tc_{i}",
                            call_id=f"tc_random_{i}",
                            type="function_call",
                            name="get_weather",
                            arguments=f'{{"location": "City{i}"}}',
                            status="completed",
                        ),
                    )

                yield ResponseCompletedEvent(
                    output_index=9,
                    sequence_number=9,
                    type="response.completed",
                    event_id="event_1",
                    response=OpenAIResponse(
                        id="resp_1",
                        created_at=1234567890,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=True,
                        tool_choice="auto",
                        tools=[
                            FunctionTool(
                                type="function",
                                name="get_weather",
                                parameters={"location": str},
                            )
                        ],
                        output=[
                            ResponseFunctionToolCall(
                                id=f"tc_{i}",
                                call_id=f"tc_random_{i}",
                                type="function_call",
                                name="get_weather",
                                arguments=f'{{"location": "City{i}"}}',
                                status="completed",
                            )
                            for i in range(3)
                        ],
                        usage=ResponseUsage(
                            input_tokens=50,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=30,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=80,
                        ),
                    ),
                )

            # Second turn - final response
            elif turn == 5:
                yield ResponseContentPartAddedEvent(
                    output_index=10,
                    sequence_number=10,
                    type="response.content_part.added",
                    event_id="event_2",
                    item_id="item_final",
                    content_index=0,
                    part=ResponseOutputText(
                        type="output_text", text="", annotations=[]
                    ),
                )

                yield ResponseTextDeltaEvent(
                    type="response.output_text.delta",
                    event_id="event_3",
                    item_id="item_final",
                    logprobs=[],
                    sequence_number=11,
                    output_index=11,
                    content_index=0,
                    delta="Done",
                )

                yield ResponseContentPartDoneEvent(
                    type="response.content_part.done",
                    event_id="event_4",
                    item_id="item_final",
                    sequence_number=12,
                    output_index=12,
                    content_index=0,
                    part=ResponseOutputText(
                        type="output_text", text="Done", annotations=[]
                    ),
                )

                yield ResponseCompletedEvent(
                    output_index=13,
                    sequence_number=13,
                    type="response.completed",
                    event_id="event_5",
                    response=OpenAIResponse(
                        id="resp_2",
                        created_at=1234567891,
                        status="completed",
                        model="gpt-5-mini",
                        object="response",
                        parallel_tool_calls=False,
                        tool_choice="auto",
                        tools=[],
                        output=[
                            ResponseOutputMessage(
                                id="item_final",
                                type="message",
                                role="assistant",
                                status="completed",
                                content=[
                                    ResponseOutputText(
                                        type="output_text", text="Done", annotations=[]
                                    )
                                ],
                            )
                        ],
                        usage=ResponseUsage(
                            input_tokens=80,
                            input_tokens_details={"cached_tokens": 0},
                            output_tokens=5,
                            output_tokens_details={"reasoning_tokens": 0},
                            total_tokens=85,
                        ),
                    ),
                )

        routine = AgentsRoutine(client=mock_openai_client)
        events = []

        with patch(
            "neuroagent.agent_routine.AgentsRoutine.get_chat_completion",
            side_effect=mock_multiple_tool_calls,
        ):
            async for event in routine.astream(
                agent=agent,
                messages=messages,
                context_variables=context_variables,
                max_parallel_tool_calls=2,  # Limit to 2
            ):
                events.append(event)

        # Check that only 2 tools were executed and 1 got rate limited message
        tool_messages = [m for m in messages if m.entity == Entity.TOOL]

        # Should have 2 successful executions + 1 rate limited
        assert len(tool_messages) >= 2
        assert (
            "could not be executed due to rate limit. Call it again."
            in tool_messages[2].content
        )
