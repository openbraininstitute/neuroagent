"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createThreadWithMessage } from "@/actions/create-thread";
import { useStore } from "@/lib/store";

export function ChatInput() {
  const { newMessage, setNewMessage } = useStore();
  const [input, setInput] = useState("");

  const storeMsgAndCreateThread = async () => {
    if (newMessage === "" && input !== "") {
      setNewMessage(input);
    }
    return createThreadWithMessage();
  };

  const [, formAction, isPending] = useActionState(storeMsgAndCreateThread, null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      <h1 className="text-2xl my-4 font-bold mb-6">
        What can I help you with?
      </h1>
      <form
        data-testid="chat-form"
        action={formAction}
        onSubmit={(e) => {
          if (!input.trim()) {
            e.preventDefault();
            return;
          }
          setInput("");
        }}
        className="w-full flex justify-center"
      >
        <div className="relative w-1/2">
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
          {isPending && (
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2"
              data-testid="loading-spinner"
            >
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
