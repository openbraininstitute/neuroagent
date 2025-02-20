"use server";

import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function createThread() {
  let threadId: string;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const { projectID, virtualLabID } = await getSettings();

    const threadResponse = await fetcher({
      method: "POST",
      path: "/threads",
      queryParams: { project_id: projectID, virtual_lab_id: virtualLabID },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    const { thread_id: newThreadId } = threadResponse;
    threadId = newThreadId;

    revalidateTag("threads");
    return { success: true, threadId };
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return { success: false, error: "Failed to create thread with message" };
  }
}
