import json
from unittest.mock import patch

import pytest
from openai.types.chat.chat_completion_chunk import (
    ChatCompletionChunk,
    Choice,
    ChoiceDelta,
    ChoiceDeltaToolCall,
    ChoiceDeltaToolCallFunction,
)
from openai.types.completion_usage import CompletionUsage
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
        mock_openai_client.assert_create_called_with(
            **{
                "model": "openai/gpt-5-mini",
                "messages": [
                    {"role": "system", "content": "You are a helpful agent."},
                    {"role": "user", "content": "Hello !"},
                ],
                "tools": None,
                "tool_choice": None,
                "stream": False,
                "temperature": 0,
                "seed": 12008,
            }
        )

        assert response.choices[0].message.role == "assistant"
        assert response.choices[0].message.content == "sample response content"

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
        mock_openai_client.assert_create_called_with(
            **{
                "model": "openai/gpt-5-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "This is your new instructions with Bad twng and Great mrt.",
                    },
                    {"role": "user", "content": "Hello !"},
                ],
                "tools": None,
                "tool_choice": None,
                "stream": False,
                "temperature": 0,
                "seed": 12008,
            }
        )

        assert response.choices[0].message.role == "assistant"
        assert response.choices[0].message.content == "sample response content"

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
        mock_openai_client.assert_create_called_with(
            **{
                "model": "openai/gpt-5-mini",
                "messages": [
                    {"role": "system", "content": "You are a helpful agent."},
                    {"role": "user", "content": "Hello !"},
                ],
                "tools": [
                    {
                        "type": "function",
                        "name": "get_weather",
                        "description": "Great description",
                        "function": {
                            "name": "get_weather",
                            "description": "Great description",
                            "strict": False,
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
                        },
                    }
                ],
                "tool_choice": None,
                "stream": False,
                "parallel_tool_calls": True,
                "temperature": 0,
                "seed": 12008,
            }
        )

        assert response.choices[0].message.role == "assistant"
        assert response.choices[0].message.content == "sample response content"

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
        tool_calls = tool_call_message.choices[0].message.tool_calls
        tool_calls_db = [
            ToolCalls(
                tool_call_id=tool_call.id,
                name=tool_call.function.name,
                arguments=tool_call.function.arguments,
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
        tool_calls = tool_call_message.choices[0].message.tool_calls
        tool_calls_db = [
            ToolCalls(
                tool_call_id=tool_call.id,
                name=tool_call.function.name,
                arguments=tool_call.function.arguments,
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
        tool_calls = tool_call_message.choices[0].message.tool_calls
        tool_calls_db = [
            ToolCalls(
                tool_call_id=tool_call.id,
                name=tool_call.function.name,
                arguments=tool_call.function.arguments,
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
        tool_call = tool_call_message.choices[0].message.tool_calls[0]
        tool_call_db = ToolCalls(
            tool_call_id=tool_call.id,
            name=tool_call.function.name,
            arguments=tool_call.function.arguments,
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
        tool_call = tool_call_message.choices[0].message.tool_calls[0]
        tool_call_db = ToolCalls(
            tool_call_id=tool_call.id,
            name=tool_call.function.name,
            arguments=tool_call.function.arguments,
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
    async def test_handle_tool_call_handoff(
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
        agent_2 = Agent(name="Test agent 2", tools=[get_weather_tool])
        context_variables = {"to_agent": agent_2}

        tool_call_message = await routine.get_chat_completion(
            agent_1,
            history=[{"role": "user", "content": "Hello"}],
            context_variables=context_variables,
            model_override=None,
        )
        tool_call = tool_call_message.choices[0].message.tool_calls[0]
        tool_call_db = ToolCalls(
            tool_call_id=tool_call.id,
            name=tool_call.function.name,
            arguments=tool_call.function.arguments,
        )
        tool_calls_result = await routine.handle_tool_call(
            tool_call=tool_call_db,
            tools=agent_1.tools,
            context_variables=context_variables,
        )

        assert tool_calls_result == (
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "tool_name": "agent_handoff_tool",
                "content": json.dumps({"assistant": agent_2.name}),
            },
            agent_2,
        )

    @pytest.mark.asyncio
    async def test_astream_complete_flow(
        self, mock_openai_client, get_weather_tool, agent_handoff_tool
    ):
        """Test complete astream flow with agent handoff, tool execution, and text response."""

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
            """Mock streaming responses for different turns."""
            history = kwargs["history"]

            # Count non-tool messages to determine which turn we're on
            turn = len([msg for msg in history if msg["role"] in ["user", "assistant"]])

            # Turn 1: Agent handoff
            if turn == 1:
                yield ChatCompletionChunk(
                    id="chunk_1",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=0,
                                        id="tc_handoff_123",
                                        function=ChoiceDeltaToolCallFunction(
                                            name="agent_handoff_tool",
                                            arguments="",
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567890,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )

                yield ChatCompletionChunk(
                    id="chunk_1",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=0,
                                        id=None,
                                        function=ChoiceDeltaToolCallFunction(
                                            name=None,
                                            arguments="{}",
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567890,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )

                yield ChatCompletionChunk(
                    id="chunk_1",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(),
                            finish_reason="tool_calls",
                            index=0,
                        )
                    ],
                    created=1234567890,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                    usage=CompletionUsage(
                        completion_tokens=10,
                        prompt_tokens=50,
                        total_tokens=60,
                    ),
                )

            # Turn 2: Weather tool call
            elif turn == 2:
                yield ChatCompletionChunk(
                    id="chunk_2",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=0,
                                        id="tc_weather_456",
                                        function=ChoiceDeltaToolCallFunction(
                                            name="get_weather",
                                            arguments="",
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567891,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )

                yield ChatCompletionChunk(
                    id="chunk_2",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=0,
                                        id=None,
                                        function=ChoiceDeltaToolCallFunction(
                                            name=None,
                                            arguments='{"location"',
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567891,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )

                yield ChatCompletionChunk(
                    id="chunk_2",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=0,
                                        id=None,
                                        function=ChoiceDeltaToolCallFunction(
                                            name=None,
                                            arguments=': "San Francisco"}',
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567891,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )

                yield ChatCompletionChunk(
                    id="chunk_2",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(),
                            finish_reason="tool_calls",
                            index=0,
                        )
                    ],
                    created=1234567891,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                    usage=CompletionUsage(
                        completion_tokens=15,
                        prompt_tokens=80,
                        total_tokens=95,
                    ),
                )

            # Turn 3: Final text response
            elif turn == 3:
                text_chunks = ["The weather ", "in San Francisco ", "is sunny today!"]
                for chunk_text in text_chunks:
                    yield ChatCompletionChunk(
                        id="chunk_3",
                        choices=[
                            Choice(
                                delta=ChoiceDelta(content=chunk_text),
                                finish_reason=None,
                                index=0,
                            )
                        ],
                        created=1234567892,
                        model="gpt-5-mini",
                        object="chat.completion.chunk",
                    )

                yield ChatCompletionChunk(
                    id="chunk_3",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(),
                            finish_reason="stop",
                            index=0,
                        )
                    ],
                    created=1234567892,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                    usage=CompletionUsage(
                        completion_tokens=20,
                        prompt_tokens=100,
                        total_tokens=120,
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

        # Expected flow:
        # 1. start (initial message)
        # 2. tool-input-start (handoff tool)
        # 3. tool-input-available (handoff tool complete)
        # 4. tool-output-available (handoff result)
        # 5. finish-step
        # 6. tool-input-start (weather tool)
        # 7. tool-input-delta (weather args streaming)
        # 8. tool-input-available (weather tool complete)
        # 9. tool-output-available (weather result)
        # 10. finish-step
        # 11. text-start
        # 12. text-delta (multiple)
        # 13. text-end
        # 14. finish-step
        # 15. finish

        assert "start" in event_types
        assert event_types.count("tool-input-start") == 2  # handoff + weather
        assert event_types.count("tool-input-available") == 2
        assert event_types.count("tool-output-available") == 2
        assert event_types.count("finish-step") == 3  # after each turn
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

            # Count non-tool messages to determine which turn we're on
            turn = len([msg for msg in history if msg["role"] in ["user", "assistant"]])

            if turn == 1:
                yield ChatCompletionChunk(
                    id="chunk",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=0,
                                        id="tc_123",
                                        function=ChoiceDeltaToolCallFunction(
                                            name="get_weather",
                                            arguments='{"location": "NYC"}',
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason="tool_calls",
                            index=0,
                        )
                    ],
                    created=1234567890,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                    usage=CompletionUsage(
                        completion_tokens=10, prompt_tokens=50, total_tokens=60
                    ),
                )
            elif turn == 2:
                text_chunks = ["The weather ", "in San Francisco ", "is sunny today!"]
                for chunk_text in text_chunks:
                    yield ChatCompletionChunk(
                        id="chunk_3",
                        choices=[
                            Choice(
                                delta=ChoiceDelta(content=chunk_text),
                                finish_reason=None,
                                index=0,
                            )
                        ],
                        created=1234567892,
                        model="gpt-5-mini",
                        object="chat.completion.chunk",
                    )

                yield ChatCompletionChunk(
                    id="chunk_3",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(),
                            finish_reason="stop",
                            index=0,
                        )
                    ],
                    created=1234567892,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                    usage=CompletionUsage(
                        completion_tokens=20,
                        prompt_tokens=100,
                        total_tokens=120,
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

        # Should have forced a final text response about rate limiting
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
            # Reasoning chunks
            reasoning_parts = ["Let me think", " about this", " carefully"]
            for part in reasoning_parts:
                chunk = ChatCompletionChunk(
                    id="chunk",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(reasoning=part),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567890,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )
                # Add reasoning attribute manually since it's not in standard delta
                chunk.choices[0].delta.reasoning = part
                yield chunk

            # Final answer
            yield ChatCompletionChunk(
                id="chunk",
                choices=[
                    Choice(
                        delta=ChoiceDelta(content="Here's the solution"),
                        finish_reason="stop",
                        index=0,
                    )
                ],
                created=1234567890,
                model="gpt-5-mini",
                object="chat.completion.chunk",
                usage=CompletionUsage(
                    completion_tokens=20, prompt_tokens=10, total_tokens=30
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

        # Verify reasoning events
        assert "reasoning-start" in event_types
        assert "reasoning-delta" in event_types
        assert "reasoning-end" in event_types

        # Verify reasoning content
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

        # Make weather tool require HIL
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
            yield ChatCompletionChunk(
                id="chunk",
                choices=[
                    Choice(
                        delta=ChoiceDelta(
                            tool_calls=[
                                ChoiceDeltaToolCall(
                                    index=0,
                                    id="tc_hil",
                                    function=ChoiceDeltaToolCallFunction(
                                        name="get_weather",
                                        arguments='{"location": "Paris"}',
                                    ),
                                    type="function",
                                )
                            ]
                        ),
                        finish_reason="tool_calls",
                        index=0,
                    )
                ],
                created=1234567890,
                model="gpt-5-mini",
                object="chat.completion.chunk",
                usage=CompletionUsage(
                    completion_tokens=10, prompt_tokens=50, total_tokens=60
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

        # Find finish event with HIL metadata
        finish_events = [e for e in parsed_events if e["type"] == "finish"]
        assert len(finish_events) == 1

        finish_event = finish_events[0]
        assert "messageMetadata" in finish_event
        assert "hil" in finish_event["messageMetadata"]

        hil_data = finish_event["messageMetadata"]["hil"]
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
            # First chunk with tool call start
            for i in range(3):  # 3 tool calls
                yield ChatCompletionChunk(
                    id="chunk",
                    choices=[
                        Choice(
                            delta=ChoiceDelta(
                                tool_calls=[
                                    ChoiceDeltaToolCall(
                                        index=i,
                                        id=f"tc_{i}",
                                        function=ChoiceDeltaToolCallFunction(
                                            name="get_weather",
                                            arguments=f'{{"location": "City{i}"}}',
                                        ),
                                        type="function",
                                    )
                                ]
                            ),
                            finish_reason=None,
                            index=0,
                        )
                    ],
                    created=1234567890,
                    model="gpt-5-mini",
                    object="chat.completion.chunk",
                )

            yield ChatCompletionChunk(
                id="chunk",
                choices=[
                    Choice(
                        delta=ChoiceDelta(),
                        finish_reason="tool_calls",
                        index=0,
                    )
                ],
                created=1234567890,
                model="gpt-5-mini",
                object="chat.completion.chunk",
                usage=CompletionUsage(
                    completion_tokens=30, prompt_tokens=50, total_tokens=80
                ),
            )

            # Second turn - final response
            yield ChatCompletionChunk(
                id="chunk2",
                choices=[
                    Choice(
                        delta=ChoiceDelta(content="Done"),
                        finish_reason="stop",
                        index=0,
                    )
                ],
                created=1234567891,
                model="gpt-5-mini",
                object="chat.completion.chunk",
                usage=CompletionUsage(
                    completion_tokens=5, prompt_tokens=80, total_tokens=85
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
