"use server";

import { env } from "@/lib/env";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

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

    await fetcher({
      method: "PATCH",
      path: "/threads/{threadId}",
      pathParams: { threadId },
      body: { title },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

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
