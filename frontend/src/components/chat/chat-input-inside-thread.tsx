"use client";

import { Send, OctagonX } from "lucide-react";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";
import TextareaAutosize from "react-textarea-autosize";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  startTransition,
  useState,
  useEffect,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resetInfiniteQueryPagination } from "@/hooks/get-message-page";
import { ModelSelectionDropdown } from "./model-selection";
import { LLMModel } from "@/lib/types";
import { SuggestionCycler } from "./suggestion-cycler";
import { SuggestionDots } from "./suggestion-dots";

type ChatInputInsideThreadProps = {
  input: string;
  isLoading: boolean;
  availableTools: Array<{ slug: string; label: string }>;
  availableModels: Array<LLMModel>;
  checkedTools: Record<string, boolean>;
  currentModel: LLMModel;
  threadId: string;
  setCheckedTools: (tools: Record<string, boolean>) => void;
  setCurrentModel: (model: LLMModel) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
  setIsAutoScrollEnabled: (enabled: boolean) => void;
  hasOngoingToolInvocations: boolean;
  onStop: () => void;
  stopped: boolean;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setIsInvalidating: Dispatch<SetStateAction<boolean>>;
  suggestions: string[];
};

export function ChatInputInsideThread({
  input,
  isLoading,
  availableTools,
  availableModels,
  checkedTools,
  currentModel,
  threadId,
  setCheckedTools,
  setCurrentModel,
  handleInputChange,
  handleSubmit,
  setIsAutoScrollEnabled,
  hasOngoingToolInvocations,
  onStop,
  stopped,
  setStopped,
  setIsInvalidating,
  suggestions,
}: ChatInputInsideThreadProps) {
  const canSend = !hasOngoingToolInvocations || stopped;
  const queryClient = useQueryClient();
  const [suggestion, setSuggestion] = useState("");
  const [fullSuggestion, setFullSuggestion] = useState("");
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  const handleSuggestionChange = (text: string) => setSuggestion(text);
  const handleFullSuggestionChange = (text: string) => setFullSuggestion(text);
  const handleIndexChange = (index: number) => setCurrentSuggestionIndex(index);

  useEffect(() => {
    if (suggestions.length > 0) {
      setFullSuggestion(suggestions[0]);
    }
  }, [suggestions]);

  const submitWrapper = (
    e: React.KeyboardEvent<HTMLTextAreaElement> | FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    handleSubmit(e);
    setStopped(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && !input && fullSuggestion) {
      e.preventDefault();
      const syntheticEvent = {
        target: { value: fullSuggestion },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(syntheticEvent);
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      if (!isLoading && canSend) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  return (
    <form
      className="mx-auto flex w-full max-w-[1200px] flex-col justify-center pb-3"
      onSubmit={(e) => {
        if (!input.trim()) {
          e.preventDefault();
          return;
        }
        setIsAutoScrollEnabled(true);
        submitWrapper(e);
      }}
    >
      {suggestions.length > 0 && (
        <div className="mb-3">
          <SuggestionCycler
            suggestions={suggestions}
            onSuggestionChange={handleSuggestionChange}
            onFullSuggestionChange={handleFullSuggestionChange}
            isPaused={input.length > 0}
            onIndexChange={handleIndexChange}
            selectedIndex={currentSuggestionIndex}
          />
        </div>
      )}
      <div className="overflow-hidden rounded-[2rem] border-2 border-gray-500">
        <div className="flex min-h-16 items-center px-6 pt-2">
          <TextareaAutosize
            className="h-6 w-full resize-none border-none bg-transparent text-base outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-400"
            name="prompt"
            placeholder={
              !input && suggestions.length > 0
                ? suggestion
                : "Message the AI..."
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => handleKeyDown(e)}
            autoComplete="off"
            maxRows={10}
          />
        </div>

        <div className="flex items-center justify-between px-6 pb-3 pt-1">
          <div className="flex items-center gap-5">
            <ToolSelectionDropdown
              availableTools={availableTools}
              checkedTools={checkedTools}
              setCheckedTools={setCheckedTools}
            />
            <SuggestionDots
              count={suggestions.length}
              activeIndex={currentSuggestionIndex}
              onDotClick={(index) => {
                setCurrentSuggestionIndex(index);
                const syntheticEvent = {
                  target: { value: suggestions[index] },
                } as React.ChangeEvent<HTMLTextAreaElement>;
                handleInputChange(syntheticEvent);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <ModelSelectionDropdown
              currentModel={currentModel}
              availableModels={availableModels}
              setCurrentModel={setCurrentModel}
            />
            {isLoading ? (
              <button
                type="button"
                className="ml-3 rounded-full bg-gray-100 p-3 text-red-500 transition-all hover:bg-gray-400 hover:text-gray-800 dark:bg-gray-600/15 dark:text-gray-300 dark:text-red-500 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.preventDefault();
                  onStop();
                  setStopped(true);
                  startTransition(() => {
                    resetInfiniteQueryPagination(
                      queryClient,
                      threadId,
                      setIsInvalidating,
                    );
                  });
                }}
              >
                <OctagonX className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                data-testid="send-button"
                className="ml-3 rounded-full bg-gray-100 p-3 text-gray-700 transition-all hover:bg-gray-400 hover:text-gray-800 dark:bg-gray-600/15 dark:text-gray-300 dark:hover:bg-gray-800"
                disabled={!canSend}
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
