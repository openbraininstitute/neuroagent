import { BMessage } from "@/lib/types";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { Message } from "@ai-sdk/ui-utils";
import { ChatPage } from "@/components/chat-page";

async function getMessages(threadId: string): Promise<BMessage[]> {
  const settings = await getSettings();

  const response = await fetch(
    `${env.BACKEND_URL}/threads/${threadId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${settings.token}`,
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

function convertToAiMessages(messages: BMessage[]): Message[] {
  const output: Message[] = [];

  for (const message of messages) {
    if (message.entity === "user") {
      output.push({
        id: message.message_id,
        content: message.msg_content,
        role: "user",
        createdAt: new Date(message.creation_date),
      });
    } else if (message.entity === "ai_message") {
      output.push({
        id: message.message_id,
        content: message.msg_content,
        role: "assistant",
        createdAt: new Date(message.creation_date),
      });
    } else if (message.entity === "ai_tool") {
      // Find corresponding tool response
      const toolResponse = messages.find(
        (m) =>
          m.entity === "tool" &&
          m.tool_calls[0]?.tool_call_id === message.tool_calls[0]?.tool_call_id,
      );

      output.push({
        id: message.message_id,
        content:
          message.msg_content +
          (toolResponse ? "\n" + toolResponse.msg_content : ""),
        role: "assistant",
        createdAt: new Date(message.creation_date),
        toolInvocations: message.tool_calls.map((tool) => ({
          toolCallId: tool.tool_call_id,
          toolName: tool.name,
          args: JSON.parse(tool.arguments),
          state: toolResponse ? ("result" as const) : ("call" as const),
          result: toolResponse?.msg_content ?? null,
        })),
      });
    }
    // Skip 'tool' messages as they're handled within ai_tool processing
  }

  return output;
}

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadID: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadID;

  const messages = await getMessages(threadId);
  const convertedMessages = convertToAiMessages(messages);

  return (
    <ChatPage
      threadId={threadId}
      threadTitle={`AI Discussion #${threadId}`}
      initialMessages={convertedMessages}
    />
  );
}
