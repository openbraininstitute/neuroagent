"use client";

import { Send } from "lucide-react";
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
      className="flex flex-col justify-center items-center gap-4 m-5"
      onSubmit={(e) => {
        setIsAutoScrollEnabled(true);
        handleSubmit(e);
      }}
    >
      <div className="w-full max-w-[1200px] flex items-center  border-2  border-gray-500 rounded-[3vw] overflow-hidden min-h-16 pl-9 pr-2">
        <TextareaAutosize
          className="flex-grow outline-none border-none bg-transparent resize-none"
          name="prompt"
          placeholder="Message the AI..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => handleKeyDown(e)}
          autoComplete="off"
          maxRows={10}
        />
        <div className="flex gap-3 mr-3">
          <ToolSelectionDropdown
            availableTools={availableTools}
            checkedTools={checkedTools}
            setCheckedTools={setCheckedTools}
          />
          {isLoading ? (
            <div className="w-6 h-6 border-2 ml-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin" />
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
