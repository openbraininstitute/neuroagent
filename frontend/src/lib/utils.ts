import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MessageStrict } from "@/lib/types";

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
                storageIds.push(parsedResult.storage_id);
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
