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

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

type LinechartProps = {
  data: JSONLinechart;
};

export function Linechart({ data }: LinechartProps) {
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
      title: {
        display: true,
        text: data.title,
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
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
