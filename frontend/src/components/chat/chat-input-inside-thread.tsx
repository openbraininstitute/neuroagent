"use client";

import { Send, OctagonX, Sparkles } from "lucide-react";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";
import TextareaAutosize from "react-textarea-autosize";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  startTransition,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resetInfiniteQueryPagination } from "@/hooks/get-message-page";
import { ModelSelectionDropdown } from "./model-selection";
import { LLMModel } from "@/lib/types";
import { ChatSuggestionsButton } from "@/components/chat/chat-suggestions-button";
import { getSuggestionsForThread } from "@/actions/get-suggestions";
import { TokenUsageIndicator } from "@/components/chat/token-usage-indicator";
import { compressConversation } from "@/actions/compress-conversation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ChatInputInsideThreadProps = {
  input: string;
  isLoading: boolean;
  availableTools: Array<{ slug: string; label: string }>;
  availableModels: Array<LLMModel>;
  checkedTools: Record<string, boolean>;
  currentModel: LLMModel;
  threadId: string;
  lastMessageId?: string;
  usage: number;
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
  lastMessageId,
  usage,
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
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isCompressing, setIsCompressing] = useState(false);
  const canSend = (!hasOngoingToolInvocations || stopped) && !isCompressing;

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

  const handleCompress = async () => {
    setIsCompressing(true);
    try {
      const result = await compressConversation(threadId);

      if (result.success) {
        toast.success("Conversation Summarized", {
          description: "Redirecting to compressed conversation...",
        });

        // Use router.push for client-side navigation
        router.push(`/threads/${result.threadId}`);
      } else {
        toast.error("Compression Failed", {
          description: result.error,
        });
        setIsCompressing(false);
      }
    } catch (error) {
      console.error("Compression failed:", error);
      toast.error("Compression Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to compress conversation",
      });
      setIsCompressing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-3">
      {!isLoading && canSend && (
        <ChatSuggestionsButton
          threadId={threadId}
          lastMessageId={lastMessageId}
          onSubmit={(suggestion) => {
            handleInputChange({
              target: { value: suggestion },
            } as React.ChangeEvent<HTMLTextAreaElement>);
            setIsAutoScrollEnabled(true);
            setStopped(false);
            setTimeout(() => {
              formRef.current?.requestSubmit();
            }, 10);
          }}
          getSuggestionsForThread={getSuggestionsForThread}
        />
      )}
      <form
        ref={formRef}
        className="flex w-full flex-col justify-center"
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
              className="h-6 w-full resize-none border-none bg-transparent text-base outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:placeholder:text-gray-400"
              name="prompt"
              placeholder="Message the AI..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyDown(e)}
              autoComplete="off"
              maxRows={10}
              disabled={isCompressing}
            />
          </div>

          <div className="flex items-center justify-between px-6 pb-3 pt-1">
            <div className="flex items-center gap-3">
              <ToolSelectionDropdown
                availableTools={availableTools}
                checkedTools={checkedTools}
                setCheckedTools={setCheckedTools}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleCompress}
                      disabled={isCompressing || isLoading}
                      className="relative opacity-50 transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {isCompressing ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
                      ) : (
                        <Sparkles className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Summarize conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TokenUsageIndicator usage={usage} />
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
    </div>
  );
}
