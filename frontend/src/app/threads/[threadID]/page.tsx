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
      next: {
        tags: [`thread/${threadId}/messages`],
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  return response.json();
}

async function getThread(threadId: string) {
  const settings = await getSettings();

  const response = await fetch(`${env.BACKEND_URL}/threads/${threadId}`, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
    },
    next: {
      tags: [`thread/${threadId}`],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch thread: ${response.statusText}`);
  }

  return response.json();
}

function convertToAiMessages(messages: BMessage[]): Message[] {
  const output: Message[] = [];

  for (const message of messages) {
    if (message.entity === "user") {
      output.push({
        id: message.message_id,
        content: message.msg_content.content,
        role: "user",
        createdAt: new Date(message.creation_date),
      });
    } else if (message.entity === "ai_message") {
      output.push({
        id: message.message_id,
        content: message.msg_content.content,
        role: "assistant",
        createdAt: new Date(message.creation_date),
      });
    } else if (message.entity === "ai_tool") {
      const toolInvocations = message.tool_calls.map((toolCall) => {
        const toolResponse = messages.find(
          (m) =>
            m.entity === "tool" &&
            m.msg_content.tool_call_id === toolCall.tool_call_id,
        );

        return {
          toolCallId: toolCall.tool_call_id,
          toolName: toolCall.name,
          args: JSON.parse(toolCall.arguments),
          state: toolResponse ? ("result" as const) : ("call" as const),
          result: toolResponse?.msg_content.content ?? null,
        };
      });

      output.push({
        id: message.message_id,
        content: message.msg_content.content,
        role: "assistant",
        createdAt: new Date(message.creation_date),
        toolInvocations,
      });
    }
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

  try {
    const [thread, messages] = await Promise.all([
      getThread(threadId),
      getMessages(threadId),
    ]);
    const convertedMessages = convertToAiMessages(messages);

    return (
      <ChatPage
        threadId={threadId}
        threadTitle={thread.title || `AI Discussion #${threadId}`}
        initialMessages={convertedMessages}
      />
    );
  } catch (error) {
    console.error("Error loading thread:", error);
    return <div>Error loading thread. Please try refreshing the page.</div>;
  }
}
