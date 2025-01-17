"use server";

import { env } from "@/lib/env";
import { getSettings } from "@/lib/cookies-server";
import { revalidatePath } from "next/cache";

export async function executeTool(previousState: unknown, formData: FormData) {
  const threadId = formData.get("threadId") as string;
  const toolCallId = formData.get("toolCallId") as string;
  const validation = formData.get("validation") as "accept" | "reject";
  const args = formData.get("args") as string | null;

  console.log(threadId);
  try {
    const { token } = await getSettings();

    const response = await fetch(
      `${env.BACKEND_URL}/tools/${threadId}/execute/${toolCallId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validation,
          args,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to execute tool: ${response.statusText}`);
    }

    // Revalidate the thread's messages to show the new tool response
    revalidatePath(`/threads/${threadId}`);

    return { success: true };
  } catch (error) {
    console.error("Error executing tool:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to execute tool",
    };
  }
}
