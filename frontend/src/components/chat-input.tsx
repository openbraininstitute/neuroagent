"use client";

import { useState } from "react";
import { useActionState, useEffect } from "react";
import { createThreadWithMessage } from "@/actions/create-thread";
import { useStore } from "@/lib/store";
import { ToolSelectionDropdown } from "@/components/tool-selection-dropdown";
import { Send } from "lucide-react";
import ChatInputLoading from "@/components/chat-input-loading";
import { useRouter } from "next/navigation";

type ChatInputProps = {
  availableTools: Array<{ slug: string; label: string }>;
};

export function ChatInput({ availableTools }: ChatInputProps) {
  const { newMessage, setNewMessage, checkedTools, setCheckedTools } =
    useStore();
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
  useEffect(() => {
    const initialCheckedTools = availableTools.reduce<Record<string, boolean>>(
      (acc, tool) => {
        acc[tool.slug] = true;
        return acc;
      },
      {},
    );
    initialCheckedTools["allchecked"] = true;
    setCheckedTools(initialCheckedTools);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  return !(isPending || state) ? (
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
        <div className="flex items-center min-w-[70%] max-w-[100%] border-2 border-gray-500 rounded-full overflow-hidden">
          <input
            name="content"
            type="text"
            autoComplete="off"
            className="flex-grow p-4 outline-none bg-transparent"
            placeholder={isPending ? "Creating thread..." : "Message the AI..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
          />
          <div className="flex gap-2 mr-3">
            <ToolSelectionDropdown
              availableTools={availableTools}
              checkedTools={checkedTools}
              setCheckedTools={setCheckedTools}
            />
            {isPending ? (
              <div
                className="w-6 h-6 border-2 ml-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin"
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
  ) : (
    <ChatInputLoading newMessage={newMessage} />
  );
}
