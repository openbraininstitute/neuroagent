import json
from unittest.mock import AsyncMock, Mock

from openai import AsyncOpenAI
from openai.types.responses import ResponseFunctionToolCall


def create_mock_response(
    message,
    function_calls=[],
    model="gpt-5-mini",
    structured_output_class=None,
):
    role = message.get("role", "assistant")
    content = message.get("content", "")

    output = []

    if content:
        output.append(
            {
                "id": "msg_mock_id",
                "type": "message",
                "status": "completed",
                "role": role,
                "content": [{"type": "output_text", "text": content}],
            }
        )

    if function_calls is not None:
        for function_call in function_calls:
            output.append(
                ResponseFunctionToolCall(
                    **{
                        "id": function_call.get("id", "fc_mock_id"),
                        "type": "function_call",
                        "status": "completed",
                        "name": function_call.get("name"),
                        "call_id": function_call.get("call_id", "fc_mock_call_id"),
                        "arguments": json.dumps(function_call.get("args", {})),
                    }
                )
            )

    mock_resp = Mock()
    mock_resp.id = "resp_mock_id"
    mock_resp.model = model
    mock_resp.output = output
    mock_resp.output_parsed = structured_output_class
    return mock_resp


class MockOpenAIClient:
    def __init__(self):
        self.responses = AsyncMock()
        self.responses.create = AsyncMock()
        self.responses.parse = AsyncMock()

    @property
    def __class__(self):
        return AsyncOpenAI

    def set_response(self, response):
        self.responses.create.return_value = response
        self.responses.parse.return_value = response

    def assert_responses_create_called_with(self, **kwargs):
        self.responses.create.assert_called_with(**kwargs)

    def assert_responses_parse_called_with(self, **kwargs):
        self.responses.parse.assert_called_with(**kwargs)
