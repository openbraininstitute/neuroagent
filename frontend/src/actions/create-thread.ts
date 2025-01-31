"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function createThreadWithMessage() {
  let thread_id: string;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const { projectID, virtualLabID } = await getSettings();

    // Generate a random title
    const randomTitle = `Thread ${new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })}`;

    // Prepare encoded query parameters
    const encodedVirtualLabID = encodeURIComponent(virtualLabID);
    const encodedProjectID = encodeURIComponent(projectID);

    // Create thread
    const threadResponse = await fetch(
      `${env.BACKEND_URL}/threads?virtual_lab_id=${encodedVirtualLabID}&project_id=${encodedProjectID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: randomTitle,
        }),
      },
    );

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.statusText}`);
    }

    const { thread_id: newThreadId } = await threadResponse.json();
    thread_id = newThreadId;

    revalidateTag("threads");
    await fetch(`${env.BACKEND_URL}/threads/${thread_id}/generate_title`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return { success: false, error: "Failed to create thread with message" };
  }
  redirect(`/threads/${thread_id}`);
}
