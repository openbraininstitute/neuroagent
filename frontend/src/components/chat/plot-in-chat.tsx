"use client";

import { ImagePlot } from "@/components/plots/image";
import { Plots } from "@/components/plots/plotly";
import { useGetPresignedUrl } from "@/hooks/get-presigned";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { memo } from "react";

type PlotDisplayProps = {
  storageIds: string[];
  fallbackUrl?: string;
};

export default function PlotsInChat({
  storageIds,
  fallbackUrl,
}: PlotDisplayProps) {
  if (storageIds.length === 0) {
    return null;
  }

  return (
    <div className="max-w ml-20 grid grid-cols-2 gap-4">
      {storageIds.map((storageId) => (
        <div key={storageId} className="flex min-h-[27rem] justify-start">
          <SinglePlotInChat
            key={storageId}
            storageId={storageId}
            fallbackUrl={fallbackUrl}
          />
        </div>
      ))}
    </div>
  );
}

const SinglePlotInChat = memo(
  ({ storageId, fallbackUrl }: { storageId: string; fallbackUrl?: string }) => {
    const {
      data: presignedUrl,
      isPending,
      isError,
    } = useGetPresignedUrl(storageId);
    const { data: responseHeader, isError: isStorageError } =
      useGetObjectFromStorage(presignedUrl as string, !isPending, true);
    const category = responseHeader?.get("X-Amz-Meta-Category");

    if (isError || isStorageError) {
      return fallbackUrl ? (
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {fallbackUrl}
        </a>
      ) : (
        <p>Error loading storage content</p>
      );
    }

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
  },
);

SinglePlotInChat.displayName = "SinglePlotInChat";
