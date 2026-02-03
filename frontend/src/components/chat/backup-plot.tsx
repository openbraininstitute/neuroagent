"use client";

import PlotsInChat from "@/components/chat/plot-in-chat";
import { MessageStrict } from "@/lib/types";

type BackupPlotProps = {
  storageIds: string[];
  message: MessageStrict;
  isStreamingLastMsg: boolean;
};

export function BackupPlot({
  storageIds,
  message,
  isStreamingLastMsg,
}: BackupPlotProps) {
  if (isStreamingLastMsg || storageIds.length === 0) {
    return null;
  }

  const storageId = storageIds[0];
  const textParts = message.parts.filter((p) => p.type === "text");
  const escapedId = storageId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasImageLink = textParts.some((p) =>
    p.text?.match(new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/${escapedId}\\)`)),
  );

  if (hasImageLink) {
    return null;
  }

  return <PlotsInChat storageIds={storageIds} />;
}
