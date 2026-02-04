"use client";

import PlotInChat from "@/components/chat/plot-in-chat";
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
    return !textParts.some((p) =>
      p.text?.match(
        new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/${storageId}\\)`),
      ),
    );
  });

  if (storageIdsWithoutImageLink.length === 0) {
    return null;
  }

  return (
    <div className="my-4 space-y-12">
      {storageIdsWithoutImageLink.map((storageId) => (
        <PlotInChat key={storageId} storageId={storageId} />
      ))}
    </div>
  );
}
