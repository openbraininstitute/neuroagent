"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";

export async function deleteThread(threadId: string) {
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
    return { success: true };
  } catch (error) {
    console.error("Error deleting thread:", error);
    return { success: false, error: "Failed to delete thread" };
  }
}
