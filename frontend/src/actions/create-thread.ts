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
  const content = formData.get("content");
  if (!content || typeof content !== "string") {
    return { success: false, error: "No content provided" };
  }

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
        body: JSON.stringify({ title: randomTitle }),
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

    // Send initial message
    const messageResponse = await fetch(
      `${env.BACKEND_URL}/qa/chat_streamed/${thread_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      },
    );

    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.statusText}`);
    }

    // Read and consume the entire stream
    const reader = messageResponse.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    revalidateTag("threads");
  } catch (error) {
    console.error("Error creating thread with message:", error);
    return { success: false, error: "Failed to create thread with message" };
  }

  redirect(`/threads/${thread_id}`);
}
