import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MessageStrict } from "./types";

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
