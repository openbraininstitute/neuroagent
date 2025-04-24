"use server";

import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { getSettings } from "@/lib/cookies-server";
import { SuggestedQuestions } from "@/lib/types";

export async function getSuggestions(
  previousState: unknown,
  user_history: string[][][],
) {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: "Not authenticated" };
  }

  const { projectID, virtualLabID } = await getSettings();

  // Add query parameters if vlab/project are present
  const queryParams: Record<string, string> = {};
  if (virtualLabID !== undefined) {
    queryParams.vlab_id = virtualLabID;
  }
  if (projectID !== undefined) {
    queryParams.project_id = projectID;
  }

  const threadResponse = await fetcher({
    method: "POST",
    path: "/qa/question_suggestions",
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: { click_history: user_history },
    queryParams,
  });

  if (!threadResponse.ok) {
    return {
      succes: false,
      error: `Error getting suggestions. Status code: ${threadResponse.status} , ${threadResponse.statusText}`,
    };
  }

  const result = (await threadResponse.json()) as SuggestedQuestions;
  return result;
}
