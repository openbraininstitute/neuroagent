import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MemoizedMarkdown } from "../memoized-markdown";

type ReasoningCollapsibleProps = {
  reasoningText: string;
  isReasoning: boolean;
  messageId: string;
};

export function ReasoningCollapsible({
  reasoningText,
  isReasoning,
  messageId,
}: ReasoningCollapsibleProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isReasoning);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReasoning) {
      setIsCollapsed(true);
    }
    if (isReasoning) {
      setIsCollapsed(false);
    }
  }, [isReasoning]);

  const toggleCollapse = () => {
    setIsAnimating(true);
    setIsCollapsed((prev) => !prev);

    // Reset animation state after transition completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  if (!reasoningText && !isReasoning) return null;

  return (
    <div className="mb-4 ml-8">
      <button
        onClick={toggleCollapse}
        className="flex items-center space-x-2 text-sm text-gray-500 transition-colors duration-200 hover:text-gray-700 focus:outline-none"
      >
        <div
          className={`transform transition-transform duration-200 ${isCollapsed ? "rotate-0" : "rotate-90"}`}
        >
          <ChevronRight className="h-4 w-4" />
        </div>
        <span>
          {isReasoning
            ? "Thinking…"
            : isCollapsed
              ? "Show reasoning"
              : "Hide reasoning"}
        </span>
      </button>

      <div
        ref={contentRef}
        className={`ml-6 overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-60 opacity-100"
        }`}
      >
        <div className="mt-1 max-h-60 max-w-[60%] overflow-y-auto whitespace-pre-wrap pr-2 text-sm text-gray-500">
          <MemoizedMarkdown content={reasoningText || ""} id={messageId} />
        </div>
      </div>
    </div>
  );
}
