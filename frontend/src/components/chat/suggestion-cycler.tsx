"use client";

import { useState, useEffect, useRef } from "react";

type SuggestionCyclerProps = {
  suggestions: string[];
  onSuggestionChange: (suggestion: string) => void;
  onFullSuggestionChange: (suggestion: string) => void;
  isPaused: boolean;
  onIndexChange: (index: number) => void;
  selectedIndex: number;
};

export function SuggestionCycler({
  suggestions,
  onSuggestionChange,
  onFullSuggestionChange,
  isPaused,
  onIndexChange,
  selectedIndex,
}: SuggestionCyclerProps) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isInitialDelay, setIsInitialDelay] = useState(true);
  const charIndexRef = useRef(0);
  const prevIndexRef = useRef(selectedIndex);

  useEffect(() => {
    if (prevIndexRef.current !== selectedIndex) {
      prevIndexRef.current = selectedIndex;
      setDisplayText("");
      setIsTyping(true);
      setIsInitialDelay(false);
      charIndexRef.current = 0;
    }
  }, [selectedIndex]);

  useEffect(() => {
    onSuggestionChange(displayText);
  }, [displayText, onSuggestionChange]);

  useEffect(() => {
    if (isPaused) {
      setDisplayText("");
      setIsTyping(true);
      setIsInitialDelay(true);
      charIndexRef.current = 0;
      return;
    }

    if (suggestions.length === 0) return;

    if (isInitialDelay) {
      const delayTimeout = setTimeout(() => {
        setIsInitialDelay(false);
      }, 1000);
      return () => clearTimeout(delayTimeout);
    }

    const currentSuggestion = suggestions[selectedIndex];
    if (currentSuggestion) {
      onFullSuggestionChange(currentSuggestion);
    }

    if (isTyping) {
      const typeInterval = setInterval(() => {
        charIndexRef.current++;
        if (charIndexRef.current <= currentSuggestion.length) {
          setDisplayText(currentSuggestion.slice(0, charIndexRef.current));
        } else {
          clearInterval(typeInterval);
          setTimeout(() => setIsTyping(false), 2000);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    } else {
      const eraseInterval = setInterval(() => {
        setDisplayText((prev) => {
          if (prev.length > 0) {
            return prev.slice(0, -1);
          } else {
            clearInterval(eraseInterval);
            setTimeout(() => {
              onIndexChange((selectedIndex + 1) % suggestions.length);
            }, 0);
            setIsTyping(true);
            return "";
          }
        });
      }, 20);

      return () => clearInterval(eraseInterval);
    }
  }, [
    suggestions,
    selectedIndex,
    isTyping,
    isPaused,
    isInitialDelay,
    onFullSuggestionChange,
    onIndexChange,
  ]);

  return null;
}
