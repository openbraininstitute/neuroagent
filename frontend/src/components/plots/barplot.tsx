"use client";

import { JSONBarplot } from "@/lib/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);
import { useGetObjectFromStorage } from "@/hooks/get-storage-object";
import { PlotProp } from "@/lib/types";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { useTheme } from "next-themes";

import Rand from "rand-seed";

export function Barplot({ presignedUrl, storageId, isInChat }: PlotProp) {
  const { theme } = useTheme();

  const rand = new Rand("1234");

  const { data: response } = useGetObjectFromStorage(
    presignedUrl as string,
    presignedUrl != "",
    false,
  );
  if (!response) {
    return null;
  }
  const data = response as JSONBarplot;

  const darkGridColor = "rgba(255, 255, 255, 0.1)";
  const gridColor = theme === "dark" ? darkGridColor : undefined;

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
        error: data.values.map((value) => value.error),
      },
    ],
  };

  const options = {
    responsive: true,
    indexAxis: (data.orientation === "horizontal" ? "y" : "x") as "x" | "y",
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: {
          color: gridColor,
        },
        title: {
          display: !!data.y_label,
          text: data.y_label,
        },
      },
      x: {
        grid: {
          color: gridColor,
        },
        title: {
          display: !!data.x_label,
          text: data.x_label,
        },
      },
    },
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 overflow-y-auto">
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
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
