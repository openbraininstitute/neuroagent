import json
from unittest.mock import AsyncMock, Mock

from openai import AsyncOpenAI
from openai.types.chat.chat_completion import ChatCompletion
from openai.types.chat.chat_completion_message_tool_call import (
    ChatCompletionMessageToolCall,
    Function,
)


def create_mock_response(
    message,
    function_calls=[],
    model="gpt-5-mini",
    structured_output_class=None,
):
    role = message.get("role", "assistant")
    content = message.get("content", "")
    tool_calls = (
        [
            ChatCompletionMessageToolCall(
                id="mock_tc_id",
                type="function",
                function=Function(
                    name=call.get("name", ""),
                    arguments=json.dumps(call.get("args", {})),
                ),
            )
            for call in function_calls
        ]
        if function_calls
        else None
    )
    return Mock(
        id="mock_cc_id",
        created=1234567890,
        model=model,
        object="chat.completion",
        choices=[
            Mock(
                message=Mock(
                    role=role,
                    content=content,
                    tool_calls=tool_calls,
                    parsed=structured_output_class,
                ),
                finish_reason="stop",
                index=0,
            )
        ],
    )


class MockOpenAIClient:
    def __init__(self):
        self.chat = AsyncMock()
        self.chat.completions = AsyncMock()
        self.beta = AsyncMock()
        self.beta.chat = AsyncMock()
        self.beta.chat.completions = AsyncMock()

    @property
    def __class__(self):
        # pretend to be the real AsyncOpenAI
        return AsyncOpenAI

    def set_response(self, response: ChatCompletion):
        """
        Set the mock to return a specific response.
        :param response: A ChatCompletion response to return.
        """
        self.chat.completions.create.return_value = response
        self.beta.chat.completions.parse.return_value = response

    def set_sequential_responses(self, responses: list[ChatCompletion]):
        """
        Set the mock to return different responses sequentially.
        :param responses: A list of ChatCompletion responses to return in order.
        """
        self.chat.completions.create.side_effect = responses
        self.beta.chat.completions.parse.side_effect = responses

    def assert_create_called_with(self, **kwargs):
        self.chat.completions.create.assert_called_with(**kwargs)

    def assert_create_called_with_structure_output(self, **kwargs):
        self.beta.chat.completions.parse.assert_called_with(**kwargs)
