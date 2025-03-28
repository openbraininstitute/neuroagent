"use client";

import { JSONHistogram } from "@/lib/types";
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

type HistogramProps = {
  data: JSONHistogram;
};

export function Histogram({ data }: HistogramProps) {
  // Calculate min and max for the bin range
  const min = Math.min(...data.values);
  const max = Math.max(...data.values);
  const binWidth = (max - min) / data.bins;

  // Create bins and count frequencies
  const frequencies = new Array(data.bins).fill(0);
  data.values.forEach((value) => {
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      data.bins - 1,
    );
    frequencies[binIndex]++;
  });

  // Create bin labels (using the center of each bin)
  const binLabels = Array.from({ length: data.bins }, (_, i) =>
    (min + (i + 0.5) * binWidth).toFixed(2),
  );

  const chartData = {
    labels: binLabels,
    datasets: [
      {
        data: frequencies,
        backgroundColor: data.color || "rgba(54, 162, 235, 0.5)",
        borderColor: data.color?.replace("0.5", "1") || "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
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
      y: {
        beginAtZero: true,
        title: {
          display: !!data.y_label,
          text: data.y_label || "Frequency",
        },
      },
      x: {
        title: {
          display: !!data.x_label,
          text: data.x_label || "Value",
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
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
