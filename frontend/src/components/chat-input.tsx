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
    <div className="flex flex-col justify-center items-center gap-4">
      <h1 className="text-2xl my-4 font-bold mb-6">
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
        <div className="absolute w-1/2">
          <input
            name="content"
            type="text"
            autoComplete="off"
            className="border-2 border-gray-500 w-full p-4 rounded-full"
            placeholder={isPending ? "Creating thread..." : "Message the AI..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
          />
          <ToolSelectionDropdown
            availableTools={availableTools}
            checkedTools={checkedTools}
            setCheckedTools={setCheckedTools}
          />
          {isPending ? (
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 -translate-x-[40%]"
              data-testid="loading-spinner"
            >
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div
              className="absolute right-4 top-1/2 -translate-y-[35%] -translate-x-[20%]"
              data-testid="loading-spinner"
            >
              <button type="submit">
                <Send className="opacity-50" />
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
