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

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { PlotProp } from "@/lib/types";
import Link from "next/link";
import { Link2 } from "lucide-react";

export function Scatterplot({ presignedUrl, isInChat, storageId }: PlotProp) {
  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl != "",
    false,
  );
  if (!response) {
    return null;
  }
  const data = response as JSONScatterplot;

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
        beginAtZero: true,
        title: {
          display: !!data.x_label,
          text: data.x_label,
        },
      },
      y: {
        beginAtZero: true,
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
        <Scatter data={chartData} options={options} />
      </div>
    </div>
  );
}
