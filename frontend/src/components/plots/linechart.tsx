"use client";

import { JSONLinechart } from "@/lib/types";
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

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { PlotProp } from "@/lib/types";
import Link from "next/link";
import { Link2 } from "lucide-react";

export function Linechart({ presignedUrl, isInChat, storageId }: PlotProp) {
  const { theme } = useTheme();

  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl != "",
    false,
  );
  if (!response) {
    return null;
  }
  const data = response as JSONLinechart;

  const darkGridColor = "rgba(255, 255, 255, 0.1)";
  const gridColor = theme === "dark" ? darkGridColor : undefined;

  const chartData = {
    labels: data.values.map((point) => point.x),
    datasets: [
      {
        data: data.values.map((point) => point.y),
        borderColor: data.line_color || "rgba(75, 192, 192, 1)",
        backgroundColor:
          data.line_color?.replace("1)", "0.5)") || "rgba(75, 192, 192, 0.5)",
        borderWidth: 2,
        tension: 0,
        pointRadius: data.show_points ? 5 : 0,
        borderDash:
          data.line_style === "dashed"
            ? [5, 5]
            : data.line_style === "dotted"
              ? [2, 2]
              : undefined,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) => {
            const point = data.values[context.dataIndex];
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
      className={`w-full max-w-3xl p-4 overflow-y-auto ${!isInChat && "mx-auto"}`}
    >
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="flex gap-2">
          <Link2 className="mt-0.5" />
          <h2 className="text-xl font-bold mb-2 underline">{data.title}</h2>
        </Link>
      ) : (
        <h2 className="text-xl font-bold mb-2">{data.title}</h2>
      )}
      {data.description && (
        <p className="text-gray-600 mb-4">{data.description}</p>
      )}
      <div>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
