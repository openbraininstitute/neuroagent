"use client";

import { Send } from "lucide-react";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";

type ChatInputInsideThreadProps = {
  input: string;
  isLoading: boolean;
  availableTools: Array<{ slug: string; label: string }>;
  checkedTools: Record<string, boolean>;
  setCheckedTools: (tools: Record<string, boolean>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.shiftKey) {
        if (!isLoading && !hasOngoingToolInvocations) {
          setIsAutoScrollEnabled(true);
          handleSubmit(e);
        }
      }
    }
  };

  return (
    <form
      className="flex flex-col justify-center items-center gap-4 mb-4"
      onSubmit={(e) => {
        setIsAutoScrollEnabled(true);
        handleSubmit(e);
      }}
    >
      <div className="flex items-center min-w-[70%] max-w-[100%] border-2 border-gray-500 rounded-full overflow-hidden">
        <input
          type="text"
          className="flex-grow outline-none w-full p-4 bg-transparent"
          name="prompt"
          placeholder="Message the AI..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="flex gap-2 mr-3">
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
