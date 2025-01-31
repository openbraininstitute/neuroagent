"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function createThreadWithMessage(
  previousState: unknown,
  formData: FormData,
) {
  const initialMessage = formData.get("content");
  let thread_id: string;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const { projectID, virtualLabID } = await getSettings();

    // Prepare encoded query parameters
    const encodedVirtualLabID = encodeURIComponent(virtualLabID);
    const encodedProjectID = encodeURIComponent(projectID);

    // Create thread
    const threadResponse = await fetch(
      `${env.BACKEND_URL}/threads/generated_title?virtual_lab_id=${encodedVirtualLabID}&project_id=${encodedProjectID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_user_message: initialMessage,
        }),
      },
    );

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.statusText}`);
    }

    const { thread_id: newThreadId } = await threadResponse.json();
    thread_id = newThreadId;

    revalidateTag("threads");
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return { success: false, error: "Failed to create thread with message" };
  }
  redirect(`/threads/${thread_id}`);
}
