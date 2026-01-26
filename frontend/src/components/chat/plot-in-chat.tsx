"use client";

import { ImagePlot } from "@/components/plots/image";
import { Plots } from "@/components/plots/plotly";
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
    <span className="ml-20 block grid grid-cols-2 gap-4">
      {storageIds.map((storageId) => (
        <SinglePlotInChat key={storageId} storageId={storageId} />
      ))}
    </span>
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
        <span className="inline-block rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
          Error loading plot
        </span>
      </span>
    );
  }

  if (!category) {
    return (
      <span className="flex h-[27rem] w-full items-center justify-center border-4">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent p-1" />
      </span>
    );
  }

  switch (category) {
    case "image":
      return <ImagePlot url={presignedUrl ?? ""} storageId={storageId} />;
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
