import { ChatInput } from "@/components/chat/chat-input";
import { getModels, getToolList } from "@/lib/server-fetches";

export async function generateMetadata() {
  return {
    title: "OBI chat",
  };
}

export default async function Home() {
  const availableTools = await getToolList();
  const availableModels = await getModels();
  return (
    <div className="flex h-full flex-col justify-center">
      <ChatInput
        availableTools={availableTools}
        availableModels={availableModels}
      />
    </div>
  );
}
