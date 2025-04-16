import { ThreadCardSidebar } from "@/components/sidebar/thread-card-sidebar";
import { getThreads } from "@/lib/server-fetches";

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
