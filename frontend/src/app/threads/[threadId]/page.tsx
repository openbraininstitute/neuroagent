import { Annotation, BMessage, MessageStrict } from "@/lib/types";
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
      next: {
        tags: [`thread/${threadId}/messages`],
      },
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
      const annotations: Annotation[] = message.tool_calls.map((call) => ({
        toolCallId: call.tool_call_id,
        validated: call.validated,
      }));
      // Since openai sends all of the parallel tool calls together and we await all
      // tool executions before proceeding anyway, it in theory cannot happen
      // that one tool call of an ai_tool message is executed while
      // others are aborted. Therefore completion is a message level annotation
      annotations.push({
        isComplete:
          message.is_complete &&
          // For every tool, check if the associated answer is complete
          message.tool_calls.every((toolCall) => {
            const toolResponse = messages.find(
              (m) =>
                m.entity === "tool" &&
                m.msg_content.tool_call_id === toolCall.tool_call_id,
            );
            return toolResponse?.is_complete ?? true; // undefined => pre-validation HIL messages => valid
          }),
      });

      const toolInvocations = message.tool_calls.map((toolCall) => {
        const toolResponse = messages.find(
          (m) =>
            m.entity === "tool" &&
            m.msg_content.tool_call_id === toolCall.tool_call_id,
        );

        // Interrupted streams might have partial json
        let args: string;
        try {
          args = JSON.parse(toolCall.arguments);
        } catch {
          args = toolCall.arguments;
        }
        return {
          toolCallId: toolCall.tool_call_id,
          toolName: toolCall.name,
          args: args,
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

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadId;

  const [messages, availableTools] = await Promise.all([
    getMessages(threadId),
    getToolList(),
  ]);
  const convertedMessages = convertToAiMessages(messages);

  return (
    <ChatPage
      key={JSON.stringify(convertedMessages.at(-1))}
      threadId={threadId}
      initialMessages={convertedMessages}
      availableTools={availableTools}
    />
  );
}
