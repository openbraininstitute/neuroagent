import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!isReasoning) {
      setIsCollapsed(true);
    }
  }, [isReasoning]);

  if (!reasoningText && !isReasoning) return null;

  return (
    <div className="mb-4 ml-8">
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
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
