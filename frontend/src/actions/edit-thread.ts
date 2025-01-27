"use server";

import { env } from "@/lib/env";
import { revalidateTag } from "next/cache";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function editThread(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const title = formData.get("title") as string;

  if (!title) {
    return { error: "Title is required" };
  }

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { error: "Not authenticated" };
    }

    const response = await fetch(`${env.BACKEND_URL}/threads/${threadId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to edit thread: ${response.statusText}`);
    }

    // Revalidate the same tags as delete for consistency
    revalidateTag("threads");
    revalidateTag(`threads/${threadId}`);
    revalidateTag(`threads/${threadId}/messages`);

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to edit thread",
    };
  }
}
