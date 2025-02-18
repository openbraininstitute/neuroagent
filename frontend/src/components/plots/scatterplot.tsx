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

type ScatterplotProps = {
  data: JSONScatterplot;
};

export function Scatterplot({ data }: ScatterplotProps) {
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
      title: {
        display: true,
        text: data.title,
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
    <div className="w-full max-w-3xl mx-auto p-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-2">{data.title}</h2>
      {data.description && (
        <p className="text-gray-600 mb-4">{data.description}</p>
      )}
      <div className="aspect-square">
        <Scatter data={chartData} options={options} />
      </div>
    </div>
  );
}
