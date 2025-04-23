import { ChatPage } from "@/components/chat/chat-page";
import { md5 } from "js-md5";
import { getThread, getToolList } from "@/lib/server-fetches";
import { getMessages } from "@/lib/server-fetches";
import { notFound } from "next/navigation";
import { convertToAiMessages } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const thread = await getThread(threadId);

  return {
    title: thread?.title,
  };
}

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const [messages, availableTools] = await Promise.all([
    getMessages(threadId),
    getToolList(),
  ]);

  if (!messages) {
    return notFound();
  }

  const convertedMessages = convertToAiMessages(messages);
  const key = convertedMessages.at(-1)
    ? md5(JSON.stringify(convertedMessages.at(-1)))
    : null;

  return (
    <ChatPage
      key={key}
      threadId={threadId}
      initialMessages={convertedMessages}
      availableTools={availableTools}
    />
  );
}
