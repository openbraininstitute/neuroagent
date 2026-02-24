import { ChatPage } from "@/components/chat/chat-page";
import { md5 } from "js-md5";
import {
  getModels,
  getThread,
  getToolList,
  getMessages,
  getThreadUsage,
} from "@/lib/server-fetches";
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

  const [
    { messages, nextCursor },
    availableTools,
    availableModels,
    tokenUsage,
  ] = await Promise.all([
    getMessages(threadId),
    getToolList(),
    getModels(),
    getThreadUsage(threadId),
  ]);

  if (!messages) {
    return notFound();
  }

  // Include threadId and tokenUsage in key to ensure remount on thread switch
  const key = `${threadId}-${tokenUsage}-${messages.at(-1) ? md5(JSON.stringify(messages.at(-1))) : "empty"}`;

  return (
    <ChatPage
      key={key}
      threadId={threadId}
      initialMessages={messages}
      initialNextCursor={nextCursor ? nextCursor : undefined}
      availableTools={availableTools}
      availableModels={availableModels}
      initialTokenUsage={tokenUsage}
    />
  );
}
