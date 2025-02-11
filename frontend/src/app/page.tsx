import { ChatInput } from "@/components/chat-input";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function isVlabAndProjectPopulated() {
  const cookieStore = await cookies();
  const vlabId = cookieStore.get("virtualLabID");
  const projectId = cookieStore.get("projectID");

  if (!(vlabId && projectId)) {
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
  return response as string[];
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
