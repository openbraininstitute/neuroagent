import { ThreadCardSidebar } from "@/components/thread-card-sidebar";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { BThread } from "@/lib/types";

async function getThreads(): Promise<BThread[]> {
  try {
    const settings = await getSettings();

    const response = await fetch(`${env.BACKEND_URL}/threads`, {
      headers: {
        Authorization: `Bearer ${settings.token}`,
      },
      next: { tags: ["threads"] },
    });

    if (!response.ok) {
      return [];
    }

    const threads = (await response.json()) as BThread[];
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
          threadID={thread.thread_id}
        />
      ))}
    </div>
  );
}
