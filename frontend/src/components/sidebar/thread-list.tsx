import { getThreads } from "@/lib/server-fetches";
import { ThreadListClient } from "./thread-list-client";

export async function ThreadList() {
  const { threads, nextPage } = await getThreads();
  return (
    <div className="flex flex-col gap-2 pl-3 pr-3">
      {<ThreadListClient initialThreads={threads} initialNextPage={nextPage} />}
    </div>
  );
}
