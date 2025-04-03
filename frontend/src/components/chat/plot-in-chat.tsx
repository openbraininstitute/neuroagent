"use client";

import { Piechart } from "@/components/plots/piechart";
import { Barplot } from "@/components/plots/barplot";
import { Scatterplot } from "@/components/plots/scatterplot";
import { ImagePlot } from "@/components/plots/image";
import { Histogram } from "@/components/plots/histogram";
import { Linechart } from "@/components/plots/linechart";
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
    <div className="ml-20 max-w-[70%] grid grid-cols-2 gap-4">
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
  const category = responseHeader?.get("X-Amz-Meta-Category");

  if (!category) {
    return (
      <div className="w-full h-full flex justify-center items-center border-4">
        <div className="w-6 h-6 border-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin" />
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
    default:
      return <p>Error: Unsupported file category: {category}</p>;
  }
});

SinglePlotInChat.displayName = "SinglePlotInChat";
