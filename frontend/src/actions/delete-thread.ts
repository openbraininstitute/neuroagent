"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteThread(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const currentThreadId = formData.get("currentThreadId") as string;
  const isOnThreadPage = currentThreadId === threadId;

  try {
    const { token } = await getSettings();

    const response = await fetch(`${env.BACKEND_URL}/threads/${threadId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete thread: ${response.statusText}`);
    }

    revalidateTag("threads");
    revalidateTag(`threads/${threadId}`);
    revalidateTag(`threads/${threadId}/messages`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete thread",
    };
  }

  // Check for redirect before returning success
  if (isOnThreadPage) {
    redirect("/");
  }

  return { success: true };
}
