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
    mutationFn: async ({
      threadId,
      toolCallId,
      validation,
      args,
      feedback,
    }) => {
      const body: BExecuteToolCallRequest = {
        validation,
        args,
        feedback,
      };
      const response = await fetcher({
        method: "PATCH",
        path: "/tools/{threadId}/execute/{toolCallId}",
        pathParams: { threadId, toolCallId },
        body,
      });
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(
          `Error making tool call. Status code: ${response.status} , ${response.statusText}`,
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries after successful execution
      void queryClient.invalidateQueries({
        queryKey: ["threads"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["threads", variables.threadId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tools", variables.toolCallId],
      });
    },
  });
}
