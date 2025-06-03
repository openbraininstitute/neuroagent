import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import { BExecuteToolCallRequest, BExecuteToolCallResponse } from "@/lib/types";

export function useExecuteTool() {
  const fetcher = useFetcher();
  const queryClient = useQueryClient();

  return useMutation<
    BExecuteToolCallResponse,
    Error,
    {
      threadId: string;
      toolCallId: string;
      validation: "accepted" | "rejected";
      args?: string;
      feedback?: string;
    }
  >({
    mutationFn: ({ threadId, toolCallId, validation, args, feedback }) => {
      const body: BExecuteToolCallRequest = {
        validation,
        args,
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
