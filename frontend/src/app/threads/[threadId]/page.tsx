import { ChatPage } from "@/components/chat/chat-page";
import { getModels, getThread, getToolList } from "@/lib/server-fetches";
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

  const [{ messages, nextCursor }, availableTools, availableModels] =
    await Promise.all([getMessages(threadId), getToolList(), getModels()]);

  if (!messages) {
    return notFound();
  }

  // Use threadId as key instead of last message hash
  // Using message hash causes remounting during streaming when messages are saved to DB
  return (
    <ChatPage
      key={threadId}
      threadId={threadId}
      initialMessages={messages}
      initialNextCursor={nextCursor ? nextCursor : undefined}
      availableTools={availableTools}
      availableModels={availableModels}
    />
  );
}
