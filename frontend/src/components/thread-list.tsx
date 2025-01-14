import { ThreadCardSidebar } from "@/components/thread-card-sidebar";
import { env } from "@/lib/env";

type Thread = {
  id: string;
  title: string;
};

async function getThreads(): Promise<Thread[]> {
  const response = await fetch(`${env.BACKEND_URL}/threads`, {
    cache: "no-store",
  });

  if (!response.ok) {
    // return dummy data
    return [
      { id: "1", title: "Thread 1" },
      { id: "2", title: "Thread 2" },
      { id: "3", title: "Thread 3" },
    ];
  }

  return response.json();
}

export async function ThreadList() {
  const threads = await getThreads();

  return (
    <div className="flex flex-col gap-2 pl-3">
      {threads.map((thread) => (
        <ThreadCardSidebar
          key={thread.id}
          title={thread.title}
          threadID={thread.id}
        />
      ))}
    </div>
  );
}
