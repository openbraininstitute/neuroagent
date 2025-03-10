import json
from unittest.mock import AsyncMock

from openai.types.chat import (
    ChatCompletionMessage,
    ParsedChatCompletion,
    ParsedChatCompletionMessage,
    ParsedChoice,
)
from openai.types.chat.chat_completion import ChatCompletion, Choice
from openai.types.chat.chat_completion_message_tool_call import (
    ChatCompletionMessageToolCall,
    Function,
)


def create_mock_response(
    message,
    function_calls=[],
    model="gpt-4o-mini",
    is_structured_output=False,
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
    if not is_structured_output:
        return ChatCompletion(
            id="mock_cc_id",
            created=1234567890,
            model=model,
            object="chat.completion",
            choices=[
                Choice(
                    message=ChatCompletionMessage(
                        role=role, content=content, tool_calls=tool_calls
                    ),
                    finish_reason="stop",
                    index=0,
                )
            ],
        )
    else:
        return ParsedChatCompletion(
            id="mock_cc_id",
            created=1234567890,
            model=model,
            object="chat.completion",
            choices=[
                ParsedChoice(
                    finish_reason="stop",
                    index=0,
                    logprobs=None,
                    message=ParsedChatCompletionMessage(
                        content=json.dumps({"title": content}),
                        refusal=None,
                        role=role,
                        audio=None,
                        function_call=None,
                        tool_calls=tool_calls,
                        parsed=structured_output_class,
                    ),
                )
            ],
        )


class MockOpenAIClient:
    def __init__(self, is_structured_output=False):
        # If this is set to true, the mock acts for structured output.
        self.is_structured_output = is_structured_output

        if not is_structured_output:
            self.chat = AsyncMock()
            self.chat.completions = AsyncMock()
        else:
            self.beta = AsyncMock()
            self.beta.chat = AsyncMock()
            self.beta.chat.completions = AsyncMock()

    def set_response(self, response: ChatCompletion):
        """
        Set the mock to return a specific response.
        :param response: A ChatCompletion response to return.
        """
        if not self.is_structured_output:
            self.chat.completions.create.return_value = response
        else:
            self.beta.chat.completions.parse.return_value = response

    def set_sequential_responses(self, responses: list[ChatCompletion]):
        """
        Set the mock to return different responses sequentially.
        :param responses: A list of ChatCompletion responses to return in order.
        """
        if not self.is_structured_output:
            self.chat.completions.create.side_effect = responses
        else:
            self.beta.chat.completions.parse.side_effect = responses

    def assert_create_called_with(self, **kwargs):
        if not self.is_structured_output:
            self.chat.completions.create.assert_called_with(**kwargs)
        else:
            self.beta.chat.completions.parse.assert_called_with(**kwargs)
