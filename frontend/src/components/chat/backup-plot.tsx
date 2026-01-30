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

  const textParts = message.parts.filter((p) => p.type === "text");
  const storageIdsWithoutImageLink = storageIds.filter((storageId) => {
    const escapedId = storageId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return !textParts.some((p) =>
      p.text?.match(
        new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/${escapedId}\\)`),
      ),
    );
  });

  if (storageIdsWithoutImageLink.length === 0) {
    return null;
  }

  return (
    <>
      {storageIdsWithoutImageLink.map((storageId) => (
        <PlotsInChat key={storageId} storageIds={[storageId]} />
      ))}
    </>
  );
}
