"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function generateEditTitle(
  previousState: unknown,
  threadId: string,
  first_user_message: string,
) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { error: "Not authenticated" };
    }

    await fetcher({
      method: "PATCH",
      path: "/threads/{threadId}/generate_title",
      pathParams: { threadId },
      body: { first_user_message },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    revalidateTag("threads");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to edit thread",
    };
  }
}
