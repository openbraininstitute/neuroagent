"use client";

import { JSONPiechart } from "@/lib/types";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import Link from "next/link";
import { Link2 } from "lucide-react";

// Register the required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { PlotProp } from "@/lib/types";

import Rand from "rand-seed";

export function Piechart({ presignedUrl, isInChat, storageId }: PlotProp) {
  const rand = new Rand("1234");

  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl != "",
    false,
  );
  if (!response) {
    return null;
  }
  const data = response as JSONPiechart;

  const labels = data.values.map((value) => value.category);
  const values = data.values.map((value) => value.value);
  const backgroundColor = data.values.map(
    (value) => value.color || `hsla(${rand.next() * 360}, 70%, 60%, 0.5)`,
  );
  const borderColor = backgroundColor.map((color) => color.replace("0.5", "1"));

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor,
        borderColor,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: "top" as const,
      },

      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"pie">) => {
            const label = context.label || "";
            const value = Number(context.raw || 0);
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage = data.show_percentages
              ? ` (${((value / total) * 100).toFixed(1)}%)`
              : "";
            return `${label}: ${value}${percentage}`;
          },
        },
      },
    },
  };

  return (
    <div
      className={`w-full max-w-2xl overflow-y-auto p-4 ${!isInChat && "mx-auto"}`}
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
      <div className={`flex ${isInChat ? "justify-center" : "justify-start"}`}>
        <div className={isInChat ? "max-w-sm" : "w-full"}>
          <Pie data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
