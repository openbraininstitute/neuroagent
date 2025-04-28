import { ChatPage } from "@/components/chat/chat-page";
import { md5 } from "js-md5";
import { getThread, getToolList } from "@/lib/server-fetches";
import { getMessages } from "@/lib/server-fetches";
import { notFound } from "next/navigation";

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

  const [{ messages, nextPage }, availableTools] = await Promise.all([
    getMessages(threadId),
    getToolList(),
  ]);

  if (!messages) {
    return notFound();
  }

  const key = messages.at(-1) ? md5(JSON.stringify(messages.at(-1))) : null;

  return (
    <ChatPage
      key={key}
      threadId={threadId}
      initialMessages={messages}
      initialNextPage={nextPage}
      availableTools={availableTools}
    />
  );
}
