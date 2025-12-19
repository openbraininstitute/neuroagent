"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb, Loader2 } from "lucide-react";
import { BQuestionsSuggestions } from "@/lib/types";

type ChatSuggestionsButtonProps = {
  threadId: string;
  lastMessageId?: string;
  onSubmit: (suggestion: string) => void;
  getSuggestionsForThread: (threadId: string) => Promise<BQuestionsSuggestions>;
};

export function ChatSuggestionsButton({
  threadId,
  lastMessageId,
  onSubmit,
  getSuggestionsForThread,
}: ChatSuggestionsButtonProps) {
  const [suggestions, setSuggestions] = useState<BQuestionsSuggestions | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cacheKey, setCacheKey] = useState<string>("");
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleGetSuggestions = async () => {
    if (isVisible) {
      setIsVisible(false);
      return;
    }

    const currentCacheKey = `${threadId}-${lastMessageId}`;

    // Check if we have cached suggestions for this thread and message
    if (cacheKey === currentCacheKey && suggestions) {
      setIsVisible(true);
      setTimeout(() => {
        suggestionsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getSuggestionsForThread(threadId);
      setSuggestions(result);
      setCacheKey(currentCacheKey);
      setIsVisible(true);
      setTimeout(() => {
        suggestionsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    } catch (error) {
      console.error("Failed to get suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll when suggestions become visible
  useEffect(() => {
    if (isVisible && suggestionsRef.current) {
      suggestionsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isVisible]);

  const handleSuggestionClick = (suggestion: string) => {
    onSubmit(suggestion);
    setIsVisible(false);
  };

  return (
    <div className="w-full" ref={suggestionsRef}>
      <Button
        onClick={handleGetSuggestions}
        variant="outline"
        size="sm"
        disabled={isLoading}
        className="mb-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading suggestions...
          </>
        ) : (
          <>
            <Lightbulb className="mr-2 h-4 w-4" />
            {isVisible ? "Hide suggestions" : "Get suggestions"}
          </>
        )}
      </Button>

      {isVisible && suggestions?.suggestions && (
        <div className="mb-4 flex flex-col gap-2">
          {suggestions.suggestions.map((item, index) => (
            <Card
              key={index}
              onClick={() => handleSuggestionClick(item.question)}
              className="cursor-pointer p-3 transition-all hover:scale-[1.01] hover:bg-muted hover:shadow-md"
            >
              <p className="text-sm">{item.question}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
