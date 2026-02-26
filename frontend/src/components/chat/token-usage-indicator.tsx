"use client";

import { useState } from "react";

type TokenUsageIndicatorProps = {
  usage: number;
  maxTokens?: number;
};

export function TokenUsageIndicator({
  usage,
  maxTokens = 400000,
}: TokenUsageIndicatorProps) {
  const [showPercentage, setShowPercentage] = useState(false);
  const percentage = Math.min(((usage || 0) / maxTokens) * 100, 100);
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on usage percentage
  const getColor = () => {
    if (percentage < 50) return "rgb(34, 197, 94)"; // green-500
    if (percentage < 75) return "rgb(234, 179, 8)"; // yellow-500
    if (percentage < 90) return "rgb(249, 115, 22)"; // orange-500
    return "rgb(239, 68, 68)"; // red-500
  };

  return (
    <div className="relative flex items-center">
      <div
        className="relative h-5 w-5 cursor-pointer"
        onMouseEnter={() => setShowPercentage(true)}
        onMouseLeave={() => setShowPercentage(false)}
      >
        <svg className="h-5 w-5 -rotate-90 transform">
          {/* Background circle */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            stroke={getColor()}
            strokeWidth="2"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
      </div>
      {showPercentage && (
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          {percentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
