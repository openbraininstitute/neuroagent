import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { MemoizedMarkdown } from "../memoized-markdown";

type ReasoningCollapsibleProps = {
  reasoningSteps: string[];
  isReasoning: boolean;
  messageId: string;
};

export function ReasoningCollapsible({
  reasoningSteps,
  isReasoning,
  messageId,
}: ReasoningCollapsibleProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isReasoning);
  const [, setIsAnimating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(
    reasoningSteps.length - 1,
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!isReasoning) {
      setIsCollapsed(true);
    }
    if (isReasoning) {
      setIsCollapsed(false);
    }
  }, [isReasoning]);

  // Update current step when new steps are added
  useEffect(() => {
    if (reasoningSteps.length > 0) {
      const newIndex = reasoningSteps.length - 1;
      if (newIndex !== currentStepIndex && isReasoning) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentStepIndex(newIndex);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 150);
        }, 150);
      }
    }
  }, [reasoningSteps.length, currentStepIndex]);

  const toggleCollapse = () => {
    setIsAnimating(true);
    setIsCollapsed((prev) => !prev);

    // Reset animation state after transition completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  if (reasoningSteps.length === 0 && !isReasoning) return null;

  const currentStep = reasoningSteps[currentStepIndex] || "";

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
        {reasoningSteps.length > 1 && !isCollapsed && (
          <span className="text-xs text-gray-400">
            ({currentStepIndex + 1}/{reasoningSteps.length})
          </span>
        )}
      </button>

      <div
        className={`ml-6 overflow-hidden transition-all duration-500 ease-in-out ${
          isCollapsed ? "max-h-0 opacity-0" : "opacity-100"
        }`}
      >
        <div className="mt-1 max-h-60 max-w-[60%] overflow-y-auto whitespace-pre-wrap pr-2 text-sm text-gray-500">
          <div
            className={`transition-opacity duration-500 ${
              isTransitioning ? "opacity-0" : "opacity-100"
            }`}
          >
            <MemoizedMarkdown
              content={currentStep}
              id={`${messageId}-${currentStepIndex}`}
            />
          </div>
        </div>

        {reasoningSteps.length > 1 && !isCollapsed && (
          <div className="ml-1 mt-2 flex space-x-1">
            {reasoningSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== currentStepIndex) {
                    console.log(index);
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setCurrentStepIndex(index);
                      setTimeout(() => {
                        setIsTransitioning(false);
                      }, 150);
                    }, 150);
                  }
                }}
                className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                  index === currentStepIndex
                    ? "bg-gray-400 dark:bg-blue-500"
                    : "bg-gray-200 hover:bg-gray-300 dark:bg-white"
                }`}
                aria-label={`Go to reasoning step ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
