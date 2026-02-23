"use client";

import { ImagePlot } from "@/components/plots/image";
import { Plots } from "@/components/plots/plotly";
import { PlotSkeleton } from "@/components/plots/skeleton";
import { useGetPresignedUrl } from "@/hooks/get-presigned";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { memo } from "react";

const PlotInChat = memo(({ storageId }: { storageId: string }) => {
  const {
    data: presignedUrl,
    isPending,
    isError,
  } = useGetPresignedUrl(storageId);
  const { data: responseHeader, isError: isStorageError } =
    useGetObjectFromStorage(
      presignedUrl as string,
      !isPending && !isError,
      true,
    );
  const category = responseHeader?.get("X-Amz-Meta-Category");

  if (isError || isStorageError) {
    return (
      <div className="ml-20 block">
        <span className="flex">
          <span className="inline-block rounded-lg border border-yellow-400/50 bg-yellow-50/80 px-4 py-2 text-xs text-yellow-700 dark:border-yellow-600/30 dark:bg-yellow-900/20 dark:text-yellow-400/80">
            Error loading plot. Plots can be seen above.
          </span>
        </span>
      </div>
    );
  }

  if (!category) {
    return <PlotSkeleton className="ml-20" />;
  }

  return (
    <div className="ml-20 block">
      {category === "image" ? (
        <ImagePlot
          url={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      ) : category === "json" ? (
        <Plots
          presignedUrl={presignedUrl ?? ""}
          storageId={storageId}
          isInChat={true}
        />
      ) : (
        <p>Error: Unsupported file category: {category}</p>
      )}
    </div>
  );
});

PlotInChat.displayName = "PlotInChat";

export default PlotInChat;
