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

function generateColors(count: number) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsla(${hue}, 70%, 60%, 0.5)`);
  }
  return {
    backgroundColor: colors,
    borderColor: colors.map((color) => color.replace("0.5", "1")),
  };
}

type BarplotProps = {
  data: JSONBarplot;
};

export function Barplot({ data }: BarplotProps) {
  const labels = data.values.map(([label]) => label);
  const values = data.values.map(([, value]) => value);
  const { backgroundColor, borderColor } = generateColors(labels.length);

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
      },
    },
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
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
