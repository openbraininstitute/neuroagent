"use client";

import { useTheme } from "next-themes";
import Plot from "react-plotly.js";

import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { PlotProp } from "@/lib/types";
import Link from "next/link";
import { Link2 } from "lucide-react";
import "./PlotStyles.css";

export function Plots({ presignedUrl, isInChat, storageId }: PlotProp) {
  const { theme } = useTheme();

  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl != "",
    false,
  );

  if (!response) {
    return null;
  }

  // Merge theme-aware layout with the response layout
  const title = response.layout.title;
  const themedLayout = {
    ...response.layout,
    paper_bgcolor: "rgba(0,0,0,0)", // Transparent background
    plot_bgcolor: "rgba(0,0,0,0)", // Transparent plot area
    title: null, // Title goes with link, not on the figure
    modebar: {
      orientation: "h",
    },
    font: {
      ...response.layout?.font,
      family:
        theme === "dark"
          ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: theme === "dark" ? "#e5e7eb" : "#1f2937", // gray-200 for dark, gray-800 for light
    },
    // Style the axes for theme
    xaxis: {
      ...response.layout?.xaxis,
      gridcolor: theme === "dark" ? "#374151" : "#e5e7eb", // gray-700 for dark, gray-200 for light
      zerolinecolor: theme === "dark" ? "#4b5563" : "#d1d5db",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937",
    },
    yaxis: {
      ...response.layout?.yaxis,
      gridcolor: theme === "dark" ? "#374151" : "#e5e7eb",
      zerolinecolor: theme === "dark" ? "#4b5563" : "#d1d5db",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937",
    },
    margin: {
      l: 0,
      r: 0,
      t: 20,
      b: 20,
    },
    autosize: true,
    height: 420,
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      {isInChat ? (
        <Link
          href={`/viewer/${storageId}`}
          className="inline-flex items-center gap-2"
        >
          <Link2 className="size-5" />
          <span className="text-xl font-bold underline">
            {title?.text || title || "Python plot"}
          </span>
        </Link>
      ) : (
        <h2 className="text-xl font-bold">{title?.text || title}</h2>
      )}

      <div className={"plot-container max-h-[420px] max-w-3xl overflow-y-auto"}>
        <Plot
          data={response.data}
          layout={themedLayout}
          frames={response.frames}
          config={{ responsive: true, displaylogo: false, autosizable: true }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
}
