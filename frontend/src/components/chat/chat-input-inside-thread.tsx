"use client";

import { Send, CircleStop } from "lucide-react";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";
import TextareaAutosize from "react-textarea-autosize";

type ChatInputInsideThreadProps = {
  input: string;
  isLoading: boolean;
  availableTools: Array<{ slug: string; label: string }>;
  checkedTools: Record<string, boolean>;
  setCheckedTools: (tools: Record<string, boolean>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
  setIsAutoScrollEnabled: (enabled: boolean) => void;
  hasOngoingToolInvocations: boolean;
  onStop: () => void;
};

export function ChatInputInsideThread({
  input,
  isLoading,
  availableTools,
  checkedTools,
  setCheckedTools,
  handleInputChange,
  handleSubmit,
  setIsAutoScrollEnabled,
  hasOngoingToolInvocations,
  onStop,
}: ChatInputInsideThreadProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      if (!isLoading && !hasOngoingToolInvocations) {
        setIsAutoScrollEnabled(true);
        handleSubmit(e);
      }
    }
  };

  return (
    <form
      className="m-5 flex flex-col items-center justify-center gap-4"
      onSubmit={(e) => {
        setIsAutoScrollEnabled(true);
        handleSubmit(e);
      }}
    >
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
            <button type="submit" className="p-1" onClick={onStop}>
              <CircleStop className="opacity-50" />
            </button>
          ) : (
            <button
              type="submit"
              data-testid="send-button"
              className="p-1"
              disabled={hasOngoingToolInvocations}
            >
              <Send className="opacity-50" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
