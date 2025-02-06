"use client";

import { useState } from "react";
import { useActionState, useEffect } from "react";
import { createThreadWithMessage } from "@/actions/create-thread";
import { useStore } from "@/lib/store";
import { ToolSelectionDropdown } from "@/components/tool-selection-dropdown";
import { Send } from "lucide-react";

type ChatInputProps = {
  availableTools: string[];
};

export function ChatInput({ availableTools }: ChatInputProps) {
  const { newMessage, setNewMessage, checkedTools, setCheckedTools } =
    useStore();
  const [input, setInput] = useState("");

  const [, action, isPending] = useActionState(createThreadWithMessage, null);

  const actionWrapper = (formData: FormData) => {
    if (newMessage === "" && input !== "") {
      setNewMessage(input);
    }
    action(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };
  useEffect(() => {
    const initialCheckedTools = availableTools.reduce<Record<string, boolean>>(
      (acc, tool) => {
        acc[tool] = true;
        return acc;
      },
      {},
    );
    initialCheckedTools["allchecked"] = true;
    setCheckedTools(initialCheckedTools);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="flex flex-col items-center gap-4 pl-2 pr-2">
      <h1 className="text-2xl font-bold mt-4 mb-6">
        What can I help you with?
      </h1>
      <form
        data-testid="chat-form"
        action={actionWrapper}
        onSubmit={(e) => {
          if (!input.trim()) {
            e.preventDefault();
            return;
          }
          setInput("");
        }}
        className="w-full flex justify-center"
      >
        {/* Outer container for the input and buttons */}
        <div className="flex flex-row-reverse items-center w-3/5">
          {/* Input field */}
          <input
            name="content"
            type="text"
            autoComplete="off"
            className="flex-grow border-2 border-gray-500 p-4 rounded-full pr-16 bg-transparent text-white" // Adjust right padding
            placeholder={isPending ? "Creating thread..." : "Message the AI..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
          />

          <div className="flex justify-around items-center absolute w-max-[20%] gap-2 pr-5">
            {/* Wrench button */}
            <ToolSelectionDropdown
              availableTools={availableTools}
              checkedTools={checkedTools}
              setCheckedTools={setCheckedTools}
            />
            {/* Send button or spinner */}
            {isPending ? (
              <div
                className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"
                data-testid="loading-spinner"
              />
            ) : (
              <button type="submit" data-testid="send-button" className="p-1">
                <Send className="opacity-50" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
