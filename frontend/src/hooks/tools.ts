import { useMutation } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import { BExecuteToolCallRequest, BExecuteToolCallResponse } from "@/lib/types";

export function useExecuteTool() {
  const fetcher = useFetcher();

  return useMutation<
    BExecuteToolCallResponse,
    Error,
    {
      threadId: string;
      toolCallId: string;
      validation: "accepted" | "rejected";
      feedback?: string;
    }
  >({
    mutationFn: ({ threadId, toolCallId, validation, feedback }) => {
      const body: BExecuteToolCallRequest = {
        validation,
        feedback,
      };
      return fetcher({
        method: "PATCH",
        path: "/tools/{threadId}/execute/{toolCallId}",
        pathParams: { threadId, toolCallId },
        body,
      }) as Promise<BExecuteToolCallResponse>;
    },
    // Note that since we set the results of the tools we do not need to invalidate queries.
  });
}
