import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MessageStrict, Annotation } from "@/lib/types";
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

// Utils to get all storage ID from a single tool call message
export function getStorageID(
  toolCall: ToolInvocationUIPart | undefined,
): string[] {
  if (
    !toolCall ||
    toolCall.type !== "tool-invocation" ||
    !toolCall.toolInvocation
  ) {
    return [];
  }

  if (
    toolCall.toolInvocation.state !== "result" ||
    !toolCall.toolInvocation.result
  ) {
    return [];
  }

  const storageIds: string[] = [];
  const rawResult = toolCall.toolInvocation.result;

  try {
    // If the result is a JSON string, parse it; otherwise assume it's already an object
    const parsedResult =
      typeof rawResult === "string" ? safeParse(rawResult) : rawResult;

    const storageId = parsedResult.storage_id;
    if (storageId) {
      if (Array.isArray(storageId)) {
        storageId.forEach((id: string) => storageIds.push(id));
      } else {
        storageIds.push(storageId);
      }
    }
  } catch {
    // ignore any parsing errors or unexpected shapes
  }

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
  return !(ann?.isComplete ?? true);
}

// Utils to get the last text part from a message
export function getLastTextContent(message: MessageStrict): string {
  const lastTextPart = message.parts?.findLast((p) => p.type === "text");
  return lastTextPart?.type === "text" ? lastTextPart.text : "";
}

// Utils to check if storage IDs are embedded in text
export function isStorageIdInText(text: string, storageIds: string[]): boolean {
  return storageIds.some((id) => {
    const pattern = new RegExp(
      `/app/storage/${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    );
    return pattern.test(text);
  });
}
