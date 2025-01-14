import { ThreadCardSidebar } from "@/components/thread-card-sidebar";
import { env } from "@/lib/env";
import { getSettings } from "@/components/settings-provider";
import { BThread, Thread } from "@/lib/types";

async function getThreads(): Promise<BThread[]> {
  const settings = await getSettings();

  const response = await fetch(`${env.BACKEND_URL}/threads`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${settings.token}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  return response.json() as Promise<BThread[]>;
}

export async function ThreadList() {
  const threads = await getThreads();

  return (
    <div className="flex flex-col gap-2 pl-3">
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
