"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createThreadWithMessage(content: string) {
  let thread_id: string;

  try {
    const { token, projectID, virtualLabID } = await getSettings();

    // Generate a random title
    const randomTitle = `Thread ${new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })}`;

    // Prepare encoded query parameters
    const encodedTitle = encodeURIComponent(randomTitle);
    const encodedVirtualLabID = encodeURIComponent(virtualLabID);
    const encodedProjectID = encodeURIComponent(projectID);

    // Create thread
    const threadResponse = await fetch(
      `${env.BACKEND_URL}/threads?title=${encodedTitle}&virtual_lab_id=${encodedVirtualLabID}&project_id=${encodedProjectID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.statusText}`);
    }

    const { thread_id: newThreadId } = await threadResponse.json();
    thread_id = newThreadId;

    // Send initial message
    const messageResponse = await fetch(
      `${env.BACKEND_URL}/qa/chat_streamed/${thread_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content }],
        }),
      },
    );

    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.statusText}`);
    }

    revalidateTag("threads");
    revalidateTag(`thread-${thread_id}`);
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return { success: false, error: "Failed to create thread with message" };
  }

  // Sleep and redirect moved outside try-catch
  //   await new Promise(resolve => setTimeout(resolve, ));
  redirect(`/threads/${thread_id}`);
}
