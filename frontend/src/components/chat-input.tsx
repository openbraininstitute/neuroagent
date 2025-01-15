"use client";

import { useState } from "react";
import { createThreadWithMessage } from "@/actions/create-thread";

export function ChatInput() {
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await createThreadWithMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      <h1 className="text-2xl my-4 font-bold mb-6">
        What can I help you with?
      </h1>
      <input
        type="text"
        className="border-2 border-gray-500 w-1/2 p-4 rounded-full"
        placeholder="Message the AI..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
