"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createThreadWithMessage } from "@/actions/create-thread";

export function ChatInput() {
  const [input, setInput] = useState("");
  const [state, formAction, isPending] = useActionState(
    createThreadWithMessage,
    null,
  );

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
        <input
          name="content"
          type="text"
          autoComplete="off"
          className="border-2 border-gray-500 w-1/2 p-4 rounded-full"
          placeholder={isPending ? "Creating thread..." : "Message the AI..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
        />
      </form>
    </div>
  );
}
