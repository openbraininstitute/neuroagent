import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MemoizedMarkdown } from "../memoized-markdown";

type ReasoningCollapsibleProps = {
  reasoningText: string;
  isReasoning: boolean;
  messageId: string;
  onComplete?: () => void;
};

export function ReasoningCollapsible({
  reasoningText,
  isReasoning,
  messageId,
  onComplete,
}: ReasoningCollapsibleProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Toggle collapse when reasoning state changes
  useEffect(() => {
    if (isReasoning) {
      setIsCollapsed(false);
    } else {
      setIsCollapsed(true);
      onComplete?.();
    }
  }, [isReasoning, onComplete]);

  if (!reasoningText && !isReasoning) return null;

  const toggle = () => setIsCollapsed((prev) => !prev);

  return (
    <div className="mb-4 ml-8">
      <button
        onClick={toggle}
        className="flex items-center space-x-2 text-sm text-gray-500 focus:outline-none"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <span>
          {isReasoning
            ? "Thinking…"
            : isCollapsed
              ? "Show reasoning"
              : "Hide reasoning"}
        </span>
      </button>

      {!isCollapsed && (
        <div className="ml-6 mt-1 max-w-[60%] whitespace-pre-wrap text-sm text-gray-500">
          <MemoizedMarkdown content={reasoningText || ""} id={messageId} />
        </div>
      )}
    </div>
  );
}
