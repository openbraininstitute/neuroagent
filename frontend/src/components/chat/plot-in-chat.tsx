"use client";

import { ImagePlot } from "@/components/plots/image";
import { Plots } from "@/components/plots/plotly";
import { PlotSkeleton } from "@/components/plots/skeleton";
import { useGetPresignedUrl } from "@/hooks/get-presigned";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { memo } from "react";

const PlotInChat = memo(
  ({
    storageId,
    isInChat = true,
  }: {
    storageId: string;
    isInChat?: boolean;
  }) => {
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
      const errorStyles = isInChat
        ? "border-yellow-400/50 bg-yellow-50/80 text-yellow-700 dark:border-yellow-600/30 dark:bg-yellow-900/20 dark:text-yellow-400/80"
        : "border-red-400/50 bg-red-50/80 text-red-700 dark:border-red-600/30 dark:bg-red-900/20 dark:text-red-400/80";
      const errorMessage = isInChat
        ? "Error loading plot. Plots can be seen above."
        : "Error loading plot.";

      return (
        <div className="ml-20 block">
          <span className="flex">
            <span
              className={`inline-block rounded-lg border px-4 py-2 text-xs ${errorStyles}`}
            >
              {errorMessage}
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
            isInChat={isInChat}
          />
        ) : category === "json" ? (
          <Plots
            presignedUrl={presignedUrl ?? ""}
            storageId={storageId}
            isInChat={isInChat}
          />
        ) : (
          <p>Error: Unsupported file category: {category}</p>
        )}
      </div>
    );
  },
);

PlotInChat.displayName = "PlotInChat";

export default PlotInChat;
