"use server";

import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { SuggestedQuestions } from "@/lib/types";

export async function getSuggestions(user_history: string[][][]) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const bodyData = { click_history: user_history };

    const threadResponse = (await fetcher({
      method: "POST",
      path: "/qa/question_suggestions",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: bodyData,
    })) as SuggestedQuestions;

    return threadResponse;
  } catch (error) {
    console.error("Error while generating the question suggestions.", error);
    return "";
  }
}
