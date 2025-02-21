import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
