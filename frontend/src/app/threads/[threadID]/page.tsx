import { BMessage } from "@/lib/types";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings-provider";
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

function convertToAiMessage(message: BMessage): Message {
  return {
    id: message.message_id,
    content: message.msg_content,
    role: message.entity === "assistant" ? "assistant" : "user",
    createdAt: new Date(message.creation_date),
    // Convert tool calls if they exist
    ...(message.tool_calls?.length > 0 && {
      toolInvocations: message.tool_calls.map((tool) => ({
        toolCallId: tool.tool_call_id,
        toolName: tool.name,
        args: JSON.parse(tool.arguments),
        state: "result",
        result: null,
      })),
    }),
  };
}

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadID: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadID;

  const messages = await getMessages(threadId);
  const convertedMessages = messages.map(convertToAiMessage);

  return (
    <ChatPage
      threadId={threadId}
      threadTitle={`AI Discussion #${threadId}`}
      initialMessages={convertedMessages}
    />
  );
}
