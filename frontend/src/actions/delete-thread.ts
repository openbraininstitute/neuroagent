"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function deleteThread(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const currentThreadId = formData.get("currentThreadId") as string;
  const isOnThreadPage = currentThreadId === threadId;

  const session = await auth();
  if (!session?.accessToken) {
    return { error: "Not authenticated" };
  }

  const response = await fetcher({
    method: "DELETE",
    path: "/threads/{threadId}",
    pathParams: { threadId },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return {
      succes: false,
      error: `Error while deleting thread. Status code:${response.status} , ${response.statusText}`,
    };
  }

  revalidateTag("threads");
  revalidateTag(`threads/${threadId}/messages`);

  // Check for redirect before returning success
  if (isOnThreadPage) {
    redirect("/");
  }

  return { success: true };
}
