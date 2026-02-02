"use client";

import { ImagePlot } from "@/components/plots/image";
import { Plots } from "@/components/plots/plotly";
import { PlotSkeleton } from "@/components/plots/skeleton";
import { useGetPresignedUrl } from "@/hooks/get-presigned";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { memo } from "react";

type PlotDisplayProps = {
  storageIds: string[];
  fallbackUrl?: string;
};

export default function PlotsInChat({ storageIds }: PlotDisplayProps) {
  if (storageIds.length === 0) {
    return null;
  }

  return (
    <>
      {storageIds.map((storageId) => (
        <span key={storageId} className="ml-20 block">
          <SinglePlotInChat storageId={storageId} />
        </span>
      ))}
    </>
  );
}

const SinglePlotInChat = memo(({ storageId }: { storageId: string }) => {
  const {
    data: presignedUrl,
    isPending,
    isError,
  } = useGetPresignedUrl(storageId);
  const { data: responseHeader, isError: isStorageError } =
    useGetObjectFromStorage(presignedUrl as string, !isPending, true);
  const category = responseHeader?.get("X-Amz-Meta-Category");

  if (isError || isStorageError) {
    return (
      <span className="flex">
        <span className="inline-block px-2 py-1 text-xs text-red-700">
          Error loading plot
        </span>
      </span>
    );
  }

  if (!category) {
    return <PlotSkeleton />;
  }

  switch (category) {
    case "image":
      return (
        <ImagePlot
          url={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      );
    case "json":
      return (
        <Plots
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
