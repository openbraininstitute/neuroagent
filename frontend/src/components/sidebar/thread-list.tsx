import { getSettings } from "@/lib/cookies-server";
import { ThreadCardSidebar } from "@/components/sidebar/thread-card-sidebar";
import { auth } from "@/lib/auth";
import { BThread } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

async function getThreads(): Promise<BThread[]> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return [];
    }

    const { projectID, virtualLabID } = await getSettings();

    const threads = (await fetcher({
      path: "/threads",
      queryParams: { project_id: projectID, virtual_lab_id: virtualLabID },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { tags: ["threads"] },
    })) as BThread[];
    // Sort threads by update_date in descending order (most recent first)
    return threads.sort(
      (a, b) =>
        new Date(b.update_date).getTime() - new Date(a.update_date).getTime(),
    );
  } catch (error) {
    console.error("Error fetching threads:", error);
    return [];
  }
}

export async function ThreadList() {
  const threads = await getThreads();
  return (
    <div className="flex flex-col gap-2 pl-3 pr-3">
      {threads.map((thread) => (
        <ThreadCardSidebar
          key={thread.thread_id}
          title={thread.title}
          threadId={thread.thread_id}
        />
      ))}
    </div>
  );
}
