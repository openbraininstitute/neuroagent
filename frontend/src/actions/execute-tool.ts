"use server";

import { env } from "@/lib/env";
import { auth } from "@/lib/auth";

export type ExecuteToolResponse = {
  error?: string;
  success?: boolean;
  content?: string;
};

export async function executeTool(
  previousState: unknown,
  formData: FormData,
): Promise<ExecuteToolResponse> {
  const threadId = formData.get("threadId") as string;
  const toolCallId = formData.get("toolCallId") as string;
  const validation = formData.get("validation") as "accepted" | "rejected";
  const args = formData.get("args") as string | null;

  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { error: "Not authenticated" };
    }

    const response = await fetch(
      `${env.BACKEND_URL}/tools/${threadId}/execute/${toolCallId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
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

    const result = await response.json();
    if (result.status === "validation-error") {
      return {
        error: "Invalid input parameters for this tool",
      };
    }

    return {
      success: true,
      content: result.content,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to execute tool",
    };
  }
}
