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

    const response = await fetcher({
      method: "PATCH",
      path: "/threads/{threadId}/generate_title",
      pathParams: { threadId },
      body: { first_user_message },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (response.ok) {
      revalidateTag("threads");
      return { success: true };
    } else {
      throw new Error(
        `Error while generating title. Status code: ${response.status} , ${response.statusText}`,
      );
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to edit thread",
    };
  }
}
