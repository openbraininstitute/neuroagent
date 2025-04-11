"use client";

import { JSONMultiLinechart, PlotProp } from "@/lib/types";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import Link from "next/link";
import { Link2 } from "lucide-react";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export function MultiLinechart({
  presignedUrl,
  isInChat,
  storageId,
}: PlotProp) {
  const { theme } = useTheme();

  // Retrieve the multi-line chart configuration from storage.
  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl !== "",
    false,
  );
  if (!response) {
    return null;
  }

  const data = response as JSONMultiLinechart;

  // Determine grid line colors
  const darkGridColor = "rgba(255, 255, 255, 0.1)";
  const gridColor = theme === "dark" ? darkGridColor : undefined;

  const fallbackColors = [
    "rgba(75, 192, 192, 1)",
    "rgba(255, 99, 132, 1)",
    "rgba(53, 162, 235, 1)",
    "rgba(255, 205, 86, 1)",
  ];
  const fallbackBackgroundColors = fallbackColors.map((color) =>
    color.replace("1)", "0.5)"),
  );

  // Build a dataset for each series.
  const datasets = data.values.map((series, index) => {
    const borderColor =
      data.line_color || fallbackColors[index % fallbackColors.length];
    const backgroundColor = data.line_color
      ? data.line_color.replace("1)", "0.5)")
      : fallbackBackgroundColors[index % fallbackBackgroundColors.length];

    let borderDash = undefined;
    if (data.line_style === "dashed") {
      borderDash = [5, 5];
    } else if (data.line_style === "dotted") {
      borderDash = [2, 2];
    }

    return {
      label: series.series_label || `Series ${index + 1}`,
      data: series.data,
      borderColor,
      backgroundColor,
      borderWidth: 1,
      tension: 0,
      pointRadius: data.show_points ? 2 : 0,
      borderDash,
      fill: false,
    };
  });

  const chartData = {
    datasets,
  };

  const options = {
    responsive: true,
    interaction: {
      mode: "nearest" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "right" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) => {
            const point = context.raw as {
              x: number;
              y: number;
              label?: string;
            };
            return point.label || `(${point.x}, ${point.y})`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        grid: {
          color: gridColor,
        },
        title: {
          display: !!data.x_label,
          text: data.x_label,
        },
      },
      y: {
        grid: {
          color: gridColor,
        },
        title: {
          display: !!data.y_label,
          text: data.y_label,
        },
      },
    },
  };

  return (
    <div
      className={`w-full max-w-3xl overflow-y-auto p-4 ${!isInChat && "mx-auto"}`}
    >
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="flex gap-2">
          <Link2 className="mt-0.5" />
          <h2 className="mb-2 text-xl font-bold underline">{data.title}</h2>
        </Link>
      ) : (
        <h2 className="mb-2 text-xl font-bold">{data.title}</h2>
      )}
      {data.description && !isInChat && (
        <p className="mb-4 text-gray-600">{data.description}</p>
      )}
      <div>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
