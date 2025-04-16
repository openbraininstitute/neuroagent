import { BThread } from "@/lib/types";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/cookies-server";
import { fetcher } from "@/lib/fetcher";

export async function getThread(threadId: string): Promise<BThread | null> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return null;
    }

    const { projectID, virtualLabID } = await getSettings();

    const queryParams: Record<string, string> = {};
    if (virtualLabID !== undefined) {
      queryParams.virtual_lab_id = virtualLabID;
    }
    if (projectID !== undefined) {
      queryParams.project_id = projectID;
    }

    const thread = (await fetcher({
      path: `/threads/${threadId}`,
      queryParams,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { tags: ["thread", threadId] },
    })) as BThread;
    // Sort threads by update_date in descending order (most recent first)
    return thread;
  } catch (error) {
    console.error(`Error fetching thread ${threadId}:`, error);
    return null;
  }
}

export async function getToolList() {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const response = await fetcher({
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  return (response as Array<{ name: string; name_frontend: string }>)
    .map((tool) => {
      return { slug: tool.name, label: tool.name_frontend };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
