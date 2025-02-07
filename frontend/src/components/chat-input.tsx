"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { createThreadWithMessage } from "@/actions/create-thread";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

import ChatInputLoading from "@/components/chat-input-loading";

export function ChatInput() {
  const { newMessage, setNewMessage } = useStore();
  const [input, setInput] = useState("");
  const router = useRouter();

  const [state, action, isPending] = useActionState(
    createThreadWithMessage,
    null,
  );

  // Watch for state changes and redirect when ready
  useEffect(() => {
    if (!isPending && state?.success && state.threadId) {
      router.push(`/threads/${state.threadId}`);
    }
  }, [state, isPending, router]);

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

  return !isPending ? (
    <div className="flex flex-col h-full justify-center items-center gap-4 ">
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
        </div>
      </form>
    </div>
  ) : (
    <ChatInputLoading newMessage={newMessage} />
  );
}
