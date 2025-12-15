"use client";

type SuggestionDotsProps = {
  count: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
};

export function SuggestionDots({
  count,
  activeIndex,
  onDotClick,
}: SuggestionDotsProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onDotClick(index)}
          className={`h-2 w-2 rounded-full transition-all ${
            index === activeIndex
              ? "bg-gray-700 dark:bg-gray-300"
              : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
          }`}
          aria-label={`Select suggestion ${index + 1}`}
        />
      ))}
    </div>
  );
}
