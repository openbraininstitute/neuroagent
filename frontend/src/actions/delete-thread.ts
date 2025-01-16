"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidateTag } from "next/cache";

export async function deleteThread(previousState: unknown, formData: FormData) {
  console.log("deleteThread", previousState, formData);
  const threadId = formData.get("threadId") as string;
  if (!threadId) {
    return { success: false, error: "No thread ID provided" };
  }

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
