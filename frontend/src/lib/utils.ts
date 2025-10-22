import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MessageStrict, MessageMetadata } from "@/lib/types";
import {
  UIMessagePart,
  ToolUIPart,
  UITools,
  UIDataTypes,
  UIMessage,
  UITool,
} from "ai";

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

// check if the part od the message is a tool.
export function isToolPart<
  DATA_TYPES extends UIDataTypes,
  TOOLS extends UITools,
>(part: UIMessagePart<DATA_TYPES, TOOLS>): part is ToolUIPart<TOOLS> {
  return part.type.startsWith("tool-");
}

// Small utility function to check if the last message has incomplete parts
export function isLastMessageComplete(messages: MessageStrict | undefined) {
  const metadata = messages?.metadata;
  if (metadata?.hil.length === 0) {
    return true;
  }
  const hasIncomplete = metadata?.hil?.some(
    (met) => "isComplete" in met && met.isComplete === false,
  );

  return !hasIncomplete;
}

// Util to get the last text part
export function getLastText(message: MessageStrict | undefined): string {
  return message?.parts.findLast((e) => e.type == "text")?.text || "";
}

// Utils to get all tool calls from an AI message
export function getToolInvocations(
  message: MessageStrict | undefined,
): ToolUIPart[] {
  return (
    message?.parts
      ?.filter((part): part is ToolUIPart => part.type.startsWith("tool-"))
      .map((part) => part) ?? []
  );
}

// Utils to get the last text part of the Message parts:
export function getLastMessageText(messages: UIMessage[]): string {
  return messages.at(-1)?.parts.findLast((e) => e.type === "text")?.text || "";
}

// Utils to get all storage ID from a single tool call message
export function getStorageID(toolCall: ToolUIPart | undefined): string[] {
  if (!toolCall || !toolCall.type.startsWith("tool-")) {
    return [];
  }

  if (toolCall.state !== "output-available" || !toolCall.output) {
    return [];
  }

  const storageIds: string[] = [];
  const rawResult = toolCall.output;

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

// Small utility function that finds the right tool call in metadata and returns its status
export function getValidationStatus(
  metadata: MessageMetadata | undefined,
  toolCallId: string,
) {
  const met = metadata?.hil?.find((a) => a.toolCallId === toolCallId);
  if (!met) return undefined;
  return met.validated;
}

// Util to check if all tools have been executed.
export function lastAssistantHasAllToolOutputs(useChatReturn: {
  messages: UIMessage[];
}) {
  const msgs = useChatReturn.messages;
  if (!Array.isArray(msgs)) {
    return false;
  }
  const last = msgs.at(-1);
  if (!last || last.role !== "assistant") return false;

  // First we check if there is some text at the end, to prevent infinite loops.
  if (getLastMessageText(msgs)) {
    return false;
  }

  // assumes tool parts are flagged with part.type including 'tool' or similar
  const parts = last.parts ?? [];
  const toolParts = parts.filter(
    (p): p is ToolUIPart => !!p.type && p.type.startsWith("tool-"),
  );

  if (toolParts.length === 0) return false;

  // here we detect output by either a 'state' or presence of an 'output' field
  return toolParts.every(
    (p: ToolUIPart) => p.state === "output-available" || !!p.output,
  );
}
