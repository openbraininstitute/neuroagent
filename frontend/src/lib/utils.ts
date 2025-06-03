import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MessageStrict, BMessage, Annotation } from "@/lib/types";
import { ToolInvocation, ToolInvocationUIPart } from "@ai-sdk/ui-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convert_tools_to_set(
  availableTools: Array<{ slug: string; label: string }>,
) {
  const initialCheckedTools = availableTools.reduce<Record<string, boolean>>(
    (acc, tool) => {
      acc[tool.slug] = true;
      return acc;
    },
    {},
  );
  initialCheckedTools["allchecked"] = true;
  return initialCheckedTools;
}

export const viewableTools = [
  "morpho-viewer-tool",
  "plot-generator",
  "random-plot-generator",
  "scsplot-tool",
];

// Function to safely parse JSONs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse<T = any>(str: string): T | string {
  try {
    return JSON.parse(str) as T;
  } catch {
    return str;
  }
}

// Small utility function to check if the last message has incomplete parts
export function isLastMessageComplete(messages: MessageStrict | undefined) {
  const annotations = messages?.annotations;
  if (annotations?.length === 0) {
    return true;
  }
  const hasIncomplete = annotations?.some(
    (ann) => "isComplete" in ann && ann.isComplete === false,
  );

  return !hasIncomplete;
}

// Utils to get all tool calls from an AI message
export function getToolInvocations(
  message: MessageStrict | undefined,
): ToolInvocation[] {
  return (
    message?.parts
      ?.filter(
        (part): part is ToolInvocationUIPart =>
          part.type === "tool-invocation" &&
          typeof part.toolInvocation === "object",
      )
      .map((part) => part.toolInvocation) ?? []
  );
}

// Utils to get all storage ID from an AI message
export function getStorageID(message: MessageStrict | undefined): string[] {
  const toolCallsResults: string[] =
    message?.parts
      ?.filter(
        (part): part is ToolInvocationUIPart =>
          part.type === "tool-invocation" &&
          typeof part.toolInvocation === "object",
      )
      .map(
        (part) =>
          part.toolInvocation.state == "result" && part.toolInvocation.result,
      ) ?? [];
  const storageIds: string[] = [];
  toolCallsResults.forEach((rawResult) => {
    try {
      // If the result is a JSON string, parse it; otherwise assume it's already an object
      const parsedResult =
        typeof rawResult === "string" ? safeParse(rawResult) : rawResult;

      const storageId = parsedResult.storage_id;
      if (storageId) {
        if (Array.isArray(storageId)) {
          storageId.forEach((el: string) => storageIds.push(el));
        } else {
          storageIds.push(storageId);
        }
      }
    } catch {
      // ignore any parsing errors or unexpected shapes
    }
  });
  return storageIds;
}

// Small utility function that finds the right tool call in annotations and returns its status
export function getValidationStatus(
  annotations: Annotation[] | undefined,
  toolCallId: string,
) {
  const ann = annotations?.find((a) => a.toolCallId === toolCallId);
  if (!ann) return undefined;
  return ann.validated;
}
export function getStoppedStatus(
  annotations: Annotation[] | undefined,
  toolCallId: string,
) {
  const ann = annotations?.find((a) => a.toolCallId === toolCallId);
  return !ann?.isComplete;
}

// function to translate from snake to camel case, and handle the annotations.
// We might want to do everythin in the backend if possible.
export function convertToAiMessages(messages: BMessage[]): MessageStrict[] {
  const output: MessageStrict[] = [];

  for (const message of messages) {
    // User messages is a simple translation
    if (message.role === "user") {
      output.push({
        id: message.id,
        content: message.content,
        role: "user",
        createdAt: new Date(message.created_at),
        parts: [{ type: "text", text: message.content }],
      });

      // Ai messages require annotation change
    } else if (message.role === "ai_message") {
      // Compute tool calls and annotations
      const tool_calls: ToolInvocationUIPart[] = [];
      const annotations: Annotation[] = [
        { message_id: message.id, isComplete: message.is_complete },
      ];

      for (const tc of message.parts) {
        tool_calls.push({
          type: "tool-invocation" as const,
          toolInvocation: {
            state: tc.results ? "result" : "call",
            toolCallId: tc.tool_call_id,
            toolName: tc.name,
            args: JSON.parse(tc.arguments),
            ...(tc.results ? { result: safeParse(tc.results) } : {}),
          } as ToolInvocation,
        });
        annotations.push({
          toolCallId: tc.tool_call_id,
          validated: tc.validated,
          isComplete: tc.is_complete,
        });
      }

      output.push({
        id: message.id,
        content: message.content,
        role: "assistant",
        createdAt: new Date(message.created_at),
        parts: [...tool_calls, { type: "text", text: message.content }],
        annotations: annotations,
      });
    }
  }
  return output;
}
