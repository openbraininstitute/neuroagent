import { ThreadCardSidebar } from "@/components/thread-card-sidebar";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings-provider";
import { BThread } from "@/lib/types";

async function getThreads(): Promise<BThread[]> {
  const settings = await getSettings();

  const response = await fetch(`${env.BACKEND_URL}/threads`, {
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
