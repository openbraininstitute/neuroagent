"use server";

import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { getSettings } from "@/lib/cookies-server";
import { BQuestionsSuggestions, UserHistory } from "@/lib/types";

export async function getSuggestions(
  previousState: unknown,
  user_history: UserHistory,
) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const { projectID, virtualLabID, frontendUrl } = await getSettings();

    // Add query parameters if vlab/project are present
    const queryParams: Record<string, string> = {};
    if (virtualLabID !== undefined) {
      queryParams.vlab_id = virtualLabID;
    }
    if (projectID !== undefined) {
      queryParams.project_id = projectID;
    }
    console.log(projectID);
    console.log(virtualLabID);
    console.log(frontendUrl);
    const threadResponse = (await fetcher({
      method: "POST",
      path: "/qa/question_suggestions",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: { click_history: user_history, frontend_url: frontendUrl },
      queryParams,
    })) as BQuestionsSuggestions;

    return threadResponse;
  } catch (error) {
    console.error("Error while generating the question suggestions.", error);
    return { success: false, error: "Failed to generate suggestions" };
  }
}

export async function getSuggestionsForThread(threadId: string) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error("Not authenticated");
    }

    const { projectID, virtualLabID } = await getSettings();

    const queryParams: Record<string, string> = {};
    if (virtualLabID !== undefined) {
      queryParams.vlab_id = virtualLabID;
    }
    if (projectID !== undefined) {
      queryParams.project_id = projectID;
    }

    const response = (await fetcher({
      method: "POST",
      path: "/qa/question_suggestions",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: { thread_id: threadId },
      queryParams,
    })) as BQuestionsSuggestions;

    return response;
  } catch (error) {
    console.error("Error while generating thread suggestions.", error);
    throw error;
  }
}
