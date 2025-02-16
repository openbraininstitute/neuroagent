import { BMessage, MessageStrict } from "@/lib/types";
import { ChatPage } from "@/components/chat-page";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { Suspense } from "react";
import { headers } from "next/headers";

async function getMessages(threadId: string): Promise<BMessage[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const response = await fetcher({
    path: "/threads/{threadId}/messages",
    pathParams: { threadId },
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { tags: [`thread/${threadId}/messages`] },
  });

  return response as Promise<BMessage[]>;
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

import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="w-full h-[50vh] flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

async function ThreadContent({
  params,
}: {
  params: Promise<{ threadID: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadID;

  const messages = await getMessages(threadId);
  const convertedMessages = convertToAiMessages(messages);
  const availableTools = await getToolList();

  return (
    <ChatPage
      threadId={threadId}
      initialMessages={convertedMessages}
      availableTools={availableTools}
    />
  );
}

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadID: string }>;
}) {
  const heads = await headers();
  const isNewThread = heads.get("referer")?.split("/").at(-1);
  if (isNewThread === "NewChat") {
    return <ThreadContent params={params} />;
  } else {
    return (
      <Suspense fallback={<Loading />}>
        <ThreadContent params={params} />
      </Suspense>
    );
  }
}
