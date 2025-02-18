"use client";

import { JSONPiechart } from "@/lib/types";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from "chart.js";
import { Pie } from "react-chartjs-2";

// Register the required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Function to generate colors dynamically
function generateColors(count: number) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsla(${hue}, 70%, 60%, 0.5)`); // background colors
  }
  return {
    backgroundColor: colors,
    borderColor: colors.map((color) => color.replace("0.5", "1")), // border colors (more opaque)
  };
}

type PiechartProps = {
  data: JSONPiechart;
};

export function Piechart({ data }: PiechartProps) {
  const categories = Object.keys(data.values);
  const { backgroundColor, borderColor } = generateColors(categories.length);

  // Convert the piechart data into Chart.js format
  const chartData = {
    labels: categories,
    datasets: [
      {
        data: Object.values(data.values),
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
      title: {
        display: true,
        text: data.title,
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
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
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
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
}
