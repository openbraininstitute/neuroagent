import { ChatInput } from "@/components/chat-input";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/cookies-server";
import { redirect } from "next/navigation";
import Loader from "@/components/loader";
import { headers } from "next/headers";
import { Suspense } from "react";

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
  return (response as Array<{ name: string; name_frontend: string }>)
    .map((tool) => {
      return { slug: tool.name, label: tool.name_frontend };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function ContentHome() {
  await isVlabAndProjectPopulated();
  const availableTools = await getToolList();
  return (
    <div className="flex flex-col justify-center h-full">
      <ChatInput availableTools={availableTools} />
    </div>
  );
}

export default async function Home() {
  const heads = await headers();
  const isNewThread = heads.get("referer")?.split("/").at(-1);
  if (isNewThread === "NewChat") {
    return <ContentHome />;
  } else {
    return (
      <Suspense fallback={<Loader />}>
        <ContentHome />
      </Suspense>
    );
  }
}
