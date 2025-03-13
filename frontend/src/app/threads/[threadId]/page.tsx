import { BMessage, MessageStrict } from "@/lib/types";
import { ChatPage } from "@/components/chat/chat-page";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { notFound } from "next/navigation";
import { CustomError } from "@/lib/types";

async function getMessages(threadId: string): Promise<BMessage[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  try {
    const response = await fetcher({
      path: "/threads/{threadId}/messages",
      pathParams: { threadId },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { tags: [`thread/${threadId}/messages`] },
    });

    return response as Promise<BMessage[]>;
  } catch (error) {
    if ((error as CustomError).statusCode === 404) {
      notFound();
    } else {
      throw error;
    }
  }
}

function convertToAiMessages(messages: BMessage[]): MessageStrict[] {
  const output: MessageStrict[] = [];

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
      const annotations = message.tool_calls.map((call) => ({
        toolCallId: call.tool_call_id,
        validated: call.validated,
        sender: message.msg_content.sender,
        toolName: call.name,
      }));

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
        annotations,
      });
    }
  }

  return output;
}

async function getToolList() {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const response = await fetcher({
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  return (response as Array<{ name: string; name_frontend: string }>)
    .map((tool) => {
      return { slug: tool.name, label: tool.name_frontend };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function getAvailableTools() {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const response = await fetcher({
    path: "/tools/available",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  return (response as Array<{ name: string; name_frontend: string }>)
    .map((tool) => {
      return { slug: tool.name, label: tool.name_frontend };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadId;

  const messages = await getMessages(threadId);
  const convertedMessages = convertToAiMessages(messages);
  const toolList = await getToolList();
  const availableTools = await getAvailableTools();

  return (
    <ChatPage
      threadId={threadId}
      initialMessages={convertedMessages}
      availableTools={availableTools}
      toolList={toolList}
    />
  );
}
