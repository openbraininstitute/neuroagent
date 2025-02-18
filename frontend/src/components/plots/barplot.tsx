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

type BarplotProps = {
  data: JSONBarplot;
};

export function Barplot({ data }: BarplotProps) {
  const labels = data.values.map(value => value.category);
  const values = data.values.map(value => value.value);
  const backgroundColor = data.values.map(value => value.color || `hsla(${Math.random() * 360}, 70%, 60%, 0.5)`);
  const borderColor = backgroundColor.map(color => color.replace("0.5", "1"));

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor,
        borderColor,
        borderWidth: 1,
        error: data.values.map(value => value.error),
      },
    ],
  };

  const options = {
    responsive: true,
    indexAxis: (data.orientation === 'horizontal' ? 'y' : 'x') as 'x' | 'y',
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
          text: data.y_label,
        },
      },
      x: {
        title: {
          display: !!data.x_label,
          text: data.x_label,
        },
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
