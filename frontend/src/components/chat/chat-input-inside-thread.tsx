"use client";

import { Send, OctagonX } from "lucide-react";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";
import TextareaAutosize from "react-textarea-autosize";
import { Dispatch, FormEvent, SetStateAction, startTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resetInfiniteQueryPagination } from "@/hooks/get-message-page";
import { ModelSelectionDropdown } from "./model-selection";
import { LLMModel } from "@/lib/types";

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
  handleInputChange: Dispatch<SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  setIsAutoScrollEnabled: (enabled: boolean) => void;
  hasOngoingToolInvocations: boolean;
  onStop: () => void;
  stopped: boolean;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setIsInvalidating: Dispatch<SetStateAction<boolean>>;
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
}: ChatInputInsideThreadProps) {
  const canSend = !hasOngoingToolInvocations || stopped;
  const queryClient = useQueryClient();

  const submitWrapper = (
    e: React.KeyboardEvent<HTMLTextAreaElement> | FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    handleSubmit(e);
    setStopped(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
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
      <div className="overflow-hidden rounded-[2rem] border-2 border-gray-500">
        <div className="flex min-h-16 items-center px-6 pt-2">
          <TextareaAutosize
            className="h-6 w-full resize-none border-none bg-transparent text-base outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-400"
            name="prompt"
            placeholder="Message the AI..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => handleKeyDown(e)}
            autoComplete="off"
            maxRows={10}
          />
        </div>

        <div className="flex items-center justify-between px-6 pb-3 pt-1">
          <ToolSelectionDropdown
            availableTools={availableTools}
            checkedTools={checkedTools}
            setCheckedTools={setCheckedTools}
          />
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
