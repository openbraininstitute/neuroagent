import { ChatInput } from "@/components/chat-input";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";

async function getToolList() {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const response = await fetcher({
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  return response as string[];
}

export default async function Home() {
  const availableTools = await getToolList();
  return (
    <div className="flex flex-col justify-center h-full">
      <ChatInput availableTools={availableTools} />
    </div>
  );
}
