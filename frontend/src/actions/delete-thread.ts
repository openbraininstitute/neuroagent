"use server";

import { env } from "@/lib/env";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function deleteThread(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const currentThreadId = formData.get("currentThreadId") as string;
  const isOnThreadPage = currentThreadId === threadId;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { error: "Not authenticated" };
    }

    const response = await fetch(`${env.BACKEND_URL}/threads/${threadId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
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
