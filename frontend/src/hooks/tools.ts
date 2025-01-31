import { useAuthenticatedSWR } from "./fetcher";
import { BExecuteToolCallRequest, BExecuteToolCallResponse } from "@/lib/types";

export function useExecuteTool(
  threadId: string,
  toolCallId: string,
  request: BExecuteToolCallRequest,
) {
  const url = `/api/tools/${threadId}/execute/${toolCallId}`;

  const config = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  };

  return useAuthenticatedSWR<BExecuteToolCallResponse>([url, config]);
}
