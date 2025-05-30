"use client";

import { JSONScatterplot } from "@/lib/types";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import { useTheme } from "next-themes";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { PlotProp } from "@/lib/types";
import Link from "next/link";
import { Link2 } from "lucide-react";

export function Scatterplot({ presignedUrl, isInChat, storageId }: PlotProp) {
  const { theme } = useTheme();

  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl != "",
    false,
  );
  if (!response) {
    return null;
  }
  const data = response as JSONScatterplot;

  const darkGridColor = "rgba(255, 255, 255, 0.1)";
  const gridColor = theme === "dark" ? darkGridColor : undefined;

  const chartData = {
    datasets: [
      {
        data: data.values.map((point) => ({
          x: point.x,
          y: point.y,
          label: point.label,
        })),
        backgroundColor: data.values.map(
          (point) => point.color || "rgba(75, 192, 192, 0.5)",
        ),
        borderColor: data.values.map(
          (point) =>
            point.color?.replace("0.5", "1") || "rgba(75, 192, 192, 1)",
        ),
        pointRadius: data.values.map((point) => point.size || 5),
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
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
      {data.description && (
        <p className="mb-4 text-gray-600">{data.description}</p>
      )}
      <div>
        <Scatter data={chartData} options={options} />
      </div>
    </div>
  );
}
