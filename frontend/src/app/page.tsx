import { ChatInput } from "@/components/chat-input";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/cookies-server";
import { redirect } from "next/navigation";

async function isVlabAndProjectPopulated() {
  const { projectID, virtualLabID } = await getSettings();
  if (!(projectID && virtualLabID)) {
    redirect("/settings");
  }
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

  // Extract just the tool names from the ToolMetadata objects
  return (response as Array<{ name: string }>).map((tool) => tool.name);
}

export default async function Home() {
  await isVlabAndProjectPopulated();
  const availableTools = await getToolList();
  return (
    <div className="flex flex-col justify-center h-full">
      <ChatInput availableTools={availableTools} />
    </div>
  );
}
