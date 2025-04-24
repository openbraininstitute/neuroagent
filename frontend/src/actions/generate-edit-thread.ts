"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function generateEditTitle(
  previousState: unknown,
  threadId: string,
  first_user_message: string,
) {
  const session = await auth();
  if (!session?.accessToken) {
    return { error: "Not authenticated" };
  }

  const response = await fetcher({
    method: "PATCH",
    path: "/threads/{threadId}/generate_title",
    pathParams: { threadId },
    body: { first_user_message },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return {
      succes: false,
      error: `Error while generating title. Status code: ${response.status} , ${response.statusText}`,
    };
  }

  revalidateTag("threads");
  return { success: true };
}
