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

/**
 * Maps AI responses to their associated tool-using messages.
 *
 * For each AI message without tools, looks backwards in the conversation
 * until a user message is found, collecting IDs of AI messages that used tools.
 * This creates a relationship between tool operations and their final response.
 *
 * Example conversation mapping:
 * user: "What's the weather?"
 * assistant: [uses weather tool] (id: "tool1")
 * assistant: "The weather is sunny" (id: "response1")
 * → Map: "response1" => Set(["tool1"])
 */
export function getAssociatedTools(messages: MessageStrict[]) {
  return messages.reduce((toolMap, message, index) => {
    if (message.role === "assistant" && !message.toolInvocations) {
      const toolIds = new Set<string>();
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i].role === "user") break;
        const msg = messages[i];
        if (msg?.role === "assistant" && msg.toolInvocations?.length) {
          msg.toolInvocations.forEach(() => toolIds.add(msg.id));
        }
      }
      toolMap.set(message.id, toolIds);
    }
    return toolMap;
  }, new Map<string, Set<string>>());
}

/**
 * Maps final assistant response IDs to a set of storage IDs.
 * For each associated tool message, it iterates over its tool invocations,
 * and if the tool is viewable (its name is in viewableTools), its state is "result",
 * and it contains a valid result with a storage_id, that storage_id is added.
 */
export function getViewableToolStorageIds(
  messages: MessageStrict[],
  associatedToolCalls: Map<string, Set<string>>,
): Map<string, Array<string>> {
  const storageIdsMap = new Map<string, Array<string>>();

  for (const [responseId, toolIds] of associatedToolCalls.entries()) {
    const storageIds = new Array<string>();

    // For each associated tool call, find the corresponding message.
    for (const toolId of toolIds) {
      const toolMessage = messages.find((msg) => msg.id === toolId);
      if (toolMessage && toolMessage.toolInvocations?.length) {
        toolMessage.toolInvocations.forEach((invocation) => {
          // Check if the tool's name is in viewableTools, its state is "result",
          // and it has a result.
          if (
            viewableTools.includes(invocation.toolName) &&
            invocation.state === "result" &&
            invocation.result
          ) {
            try {
              // Parse the result, which might be a string or an object.
              const parsedResult =
                typeof invocation.result === "string"
                  ? JSON.parse(invocation.result)
                  : invocation.result;
              if (parsedResult.storage_id) {
                if (Array.isArray(parsedResult.storage_id)) {
                  parsedResult.storage_id.map((el: string) =>
                    storageIds.push(el),
                  );
                } else {
                  storageIds.push(parsedResult.storage_id);
                }
              }
            } catch {
              // If parsing fails, ignore this invocation.
            }
          }
        });
      }
    }
    storageIdsMap.set(responseId, storageIds);
  }

  return storageIdsMap;
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
  return !(ann?.isComplete || true);
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
            ...(tc.results ? { result: JSON.parse(tc.results) } : {}),
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
