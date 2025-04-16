"use server";

import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
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

    const body: Record<string, string> = {};
    if (virtualLabID !== undefined) {
      body.virtual_lab_id = virtualLabID;
    }
    if (projectID !== undefined) {
      body.project_id = projectID;
    }

    const threadResponse = await fetcher({
      method: "POST",
      path: "/threads",
      body,
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (threadResponse.ok) {
      const { thread_id: newThreadId } = (await threadResponse.json()) as {
        thread_id: string;
      };
      threadId = newThreadId;
      revalidateTag("threads");
    } else {
      throw new Error(
        `Error while creating thread. Status code:${threadResponse.status} , ${threadResponse.statusText}`,
      );
    }
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create thread with message",
    };
  }
  redirect(`/threads/${threadId}`);
}
