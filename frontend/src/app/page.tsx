import { ChatInput } from "@/components/chat/chat-input";
import { getToolList } from "@/lib/server-fetches";

export default async function Home() {
  const availableTools = await getToolList();
  return (
    <div className="flex h-full flex-col justify-center">
      <ChatInput availableTools={availableTools} />
    </div>
  );
}
