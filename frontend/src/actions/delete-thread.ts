"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function deleteThread(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const currentThreadId = formData.get("currentThreadId") as string;
  const isOnThreadPage = currentThreadId === threadId;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { error: "Not authenticated" };
    }

    await fetcher({
      method: "DELETE",
      path: "/threads/{threadId}",
      pathParams: { threadId },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    revalidateTag("threads");
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
