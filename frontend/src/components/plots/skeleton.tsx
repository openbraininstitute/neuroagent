export function PlotSkeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`relative inline-block h-[450px] max-w-3xl overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{ width: "100%", ...style }}
    >
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/30" />
    </span>
  );
}
