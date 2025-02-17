"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { createThread } from "@/actions/create-thread";
import { generateEditTitle } from "@/actions/generate-edit-thread";
import { ToolSelectionDropdown } from "@/components/tool-selection-dropdown";
import { Send } from "lucide-react";
import { ChatPage } from "./chat-page";
import { useRouter } from "next/navigation";
import ChatInputLoading from "./chat-input-loading";

type ChatInputProps = {
  availableTools: Array<{ slug: string; label: string }>;
};

export function ChatInput({ availableTools }: ChatInputProps) {
  const initialCheckedTools = availableTools.reduce<Record<string, boolean>>(
    (acc, tool) => {
      acc[tool.slug] = true;
      return acc;
    },
    {},
  );
  initialCheckedTools["allchecked"] = true;
  const [checkedTools, setCheckedTools] = useState<{ [tool: string]: boolean }>(
    initialCheckedTools,
  );
  const [input, setInput] = useState("");
  const router = useRouter();
  const requiresHandleSubmit = useRef(true);
  const [canRedirect, setCanRedirect] = useState(false);

  const [state, action, isPending] = useActionState(createThread, null);
  const genTitle = generateEditTitle.bind(null);

  // Watch for state changes and redirect when ready
  useEffect(() => {
    if (state?.threadId) {
      // First update the URL, then trigger the full redirect.
      if (!canRedirect) {
        history.pushState({}, "", `/threads/NewChat`);
        genTitle(null, state.threadId, input);
      } else {
        router.push(`/threads/${state.threadId}`);
      }
    }
  }, [state, canRedirect, router]);

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

  return !state?.threadId ? (
    !isPending ? (
      <div className="flex flex-col items-center gap-4 pl-2 pr-2">
        <h1 className="text-2xl font-bold mt-4 mb-6">
          What can I help you with?
        </h1>
        <form
          data-testid="chat-form"
          action={action}
          onSubmit={(e) => {
            if (!input.trim()) {
              e.preventDefault();
              return;
            }
          }}
          className="w-full flex justify-center"
        >
          <div className="flex items-center min-w-[70%] max-w-[100%] border-2 border-gray-500 rounded-full overflow-hidden">
            <input
              name="content"
              type="text"
              autoComplete="off"
              className="flex-grow p-4 outline-none bg-transparent"
              placeholder={
                isPending ? "Creating thread..." : "Message the AI..."
              }
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
      <ChatInputLoading newMessage={input} />
    )
  ) : (
    <ChatPage
      threadId={state.threadId}
      initialMessages={[{ id: "temp", content: input, role: "user" }]}
      availableTools={availableTools}
      requiresHandleSubmit={requiresHandleSubmit}
      setCanRedirect={setCanRedirect}
    />
  );
}
