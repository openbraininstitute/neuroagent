"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function editThread(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const title = formData.get("title") as string;

  if (!title) {
    return { error: "Title is required" };
  }

  const session = await auth();
  if (!session?.accessToken) {
    return { error: "Not authenticated" };
  }

  const response = await fetcher({
    method: "PATCH",
    path: "/threads/{threadId}",
    pathParams: { threadId },
    body: { title },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return {
      succes: false,
      error: `Error while editing thread. Status code:${response.status} , ${response.statusText}`,
    };
  }

  // Revalidate the same tags as delete for consistency
  revalidateTag("threads");

  return { success: true };
}
