"use client";

import { Piechart } from "@/components/plots/piechart";
import { Barplot } from "@/components/plots/barplot";
import { Scatterplot } from "@/components/plots/scatterplot";
import { ImagePlot } from "@/components/plots/image";
import { Histogram } from "@/components/plots/histogram";
import { Linechart } from "@/components/plots/linechart";
import { MultiLinechart } from "../plots/multi-linechart";
import { useGetPresignedUrl } from "@/hooks/get-presigned";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { memo } from "react";

type PlotDisplayProps = {
  storageIds: string[];
};

export default function PlotsInChat({ storageIds }: PlotDisplayProps) {
  if (storageIds.length === 0) {
    return null;
  }

  return (
    <div className="ml-20 grid max-w-[70%] grid-cols-2 gap-4">
      {storageIds.map((storageId) => (
        <div key={storageId} className="flex min-h-[27rem] justify-start">
          <SinglePlotInChat key={storageId} storageId={storageId} />
        </div>
      ))}
    </div>
  );
}

const SinglePlotInChat = memo(({ storageId }: { storageId: string }) => {
  const { data: presignedUrl, isPending } = useGetPresignedUrl(storageId);
  const { data: responseHeader } = useGetObjectFromStorage(
    presignedUrl as string,
    !isPending,
    true,
  );
  const category =
    responseHeader?.get("X-Amz-Meta-Category") ||
    responseHeader?.get("x-ms-meta-category") ||
    null;

  if (!category) {
    return (
      <div className="flex h-full w-full items-center justify-center border-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent p-1" />
      </div>
    );
  }

  switch (category) {
    case "image":
      return <ImagePlot url={presignedUrl ?? ""} storageId={storageId} />;
    case "json-piechart":
      return (
        <Piechart
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    case "json-barplot":
      return (
        <Barplot
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    case "json-scatterplot":
      return (
        <Scatterplot
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    case "json-histogram":
      return (
        <Histogram
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    case "json-linechart":
      return (
        <Linechart
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    case "json-multi-linechart":
      return (
        <MultiLinechart
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    default:
      return <p>Error: Unsupported file category: {category}</p>;
  }
});

SinglePlotInChat.displayName = "SinglePlotInChat";
