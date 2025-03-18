"use client";

import { Piechart } from "@/components/plots/piechart";
import { Barplot } from "@/components/plots/barplot";
import { Scatterplot } from "@/components/plots/scatterplot";
import { ImagePlot } from "@/components/plots/image";
import { Histogram } from "@/components/plots/histogram";
import { Linechart } from "@/components/plots/linechart";
import { useGetPresignedUrl } from "@/hooks/get-presigned";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";

interface PlotDisplayProps {
  storageIds: string[];
}

export default function PlotDisplayInChat({ storageIds }: PlotDisplayProps) {
  if (storageIds.length === 0) {
    return null;
  }

  if (storageIds.length === 1) {
    return (
      <div className="flex items-center min-h-80 justify-center">
        <SinglePlotInChat storageId={storageIds[0]} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {storageIds.map((storageId) => (
        <div
          key={storageId}
          className="flex items-center min-h-80 justify-center"
        >
          <SinglePlotInChat key={storageId} storageId={storageId} />
        </div>
      ))}
    </div>
  );
}

function SinglePlotInChat({ storageId }: { storageId: string }) {
  const { data: presignedUrl, isPending } = useGetPresignedUrl(storageId);
  const { data: responseHeader } = useGetObjectFromStorage(
    presignedUrl as string,
    !isPending,
    true,
  );
  const category = responseHeader?.get("X-Amz-Meta-Category");

  if (!category) {
    return (
      <div className="w-full flex justify-center items-center">
        <div className="w-6 h-6 border-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  switch (category) {
    case "image":
      return <ImagePlot url={presignedUrl ?? ""} />;
    case "json-piechart":
      return <Piechart presignedUrl={presignedUrl ?? ""} />;
    case "json-barplot":
      return <Barplot presignedUrl={presignedUrl ?? ""} />;
    case "json-scatterplot":
      return <Scatterplot presignedUrl={presignedUrl ?? ""} />;
    case "json-histogram":
      return <Histogram presignedUrl={presignedUrl ?? ""} />;
    case "json-linechart":
      return <Linechart presignedUrl={presignedUrl ?? ""} />;
    default:
      return <p>Error: Unsupported file category: {category}</p>;
  }
}
