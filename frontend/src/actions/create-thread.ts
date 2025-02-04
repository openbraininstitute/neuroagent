"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function createThreadWithMessage(
  previousState: unknown,
  formData: FormData,
) {
  const initialMessage = formData.get("content");
  let threadId: string;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const { projectID, virtualLabID } = await getSettings();

    const threadResponse = await fetcher({
      method: "POST",
      path: "/threads/generated_title",
      queryParams: { project_id: projectID, virtual_lab_id: virtualLabID },
      body: { first_user_message: initialMessage },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    const { thread_id: newThreadId } = threadResponse;
    threadId = newThreadId;

    revalidateTag("threads");
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return { success: false, error: "Failed to create thread with message" };
  }
  redirect(`/threads/${threadId}`);
}
