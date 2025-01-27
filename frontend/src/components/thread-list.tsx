import { ThreadCardSidebar } from "@/components/thread-card-sidebar";
import { env } from "@/lib/env";
import { auth, authOptions } from "@/app/api/auth/[...nextauth]/route";
import { BThread } from "@/lib/types";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";

async function getThreads(): Promise<BThread[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return [];
    }

    const response = await fetch(`${env.BACKEND_URL}/threads`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
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
