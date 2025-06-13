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
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
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
      className="m-5 flex flex-col items-center justify-center gap-4"
      onSubmit={(e) => {
        if (!input.trim()) {
          e.preventDefault();
          return;
        }
        setIsAutoScrollEnabled(true);
        submitWrapper(e);
      }}
    >
      <div className="-mb-2 flex w-full max-w-[1200px] justify-end">
        <ModelSelectionDropdown
          currentModel={currentModel}
          availableModels={availableModels}
          setCurrentModel={setCurrentModel}
        />
      </div>
      <div className="flex min-h-16 w-full max-w-[1200px] items-center overflow-hidden rounded-[3vw] border-2 border-gray-500 pl-9 pr-2">
        <TextareaAutosize
          className="h-6 flex-grow resize-none border-none bg-transparent outline-none"
          name="prompt"
          placeholder="Message the AI..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => handleKeyDown(e)}
          autoComplete="off"
          maxRows={10}
        />
        <div className="mr-3 flex gap-3">
          <ToolSelectionDropdown
            availableTools={availableTools}
            checkedTools={checkedTools}
            setCheckedTools={setCheckedTools}
          />
          {isLoading ? (
            <button
              type="button"
              className="p-1"
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
              <OctagonX className="opacity-50" />
            </button>
          ) : (
            <button
              type="submit"
              data-testid="send-button"
              className="p-1"
              disabled={!canSend}
            >
              <Send className="opacity-50" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
