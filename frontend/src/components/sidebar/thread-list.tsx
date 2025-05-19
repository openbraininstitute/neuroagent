import { getThreads } from "@/lib/server-fetches";
import { ThreadListClient } from "./thread-list-client";
import { md5 } from "js-md5";

export async function ThreadList() {
  const { threads, nextCursor } = await getThreads();

  return (
    <ThreadListClient
      key={threads[0] ? md5(JSON.stringify(threads[0])) : null}
      initialThreads={threads}
      initialNextCursor={nextCursor}
    />
  );
}
