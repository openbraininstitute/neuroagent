"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import type { MessageStrict } from "@/lib/types";
import { env } from "@/lib/env";
import { useSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";

import { ChatMessageAI } from "@/components/chat/chat-message-ai";
import { ChatMessageHuman } from "@/components/chat/chat-message-human";
import { ChatMessageTool } from "@/components/chat/chat-message-tool";
import { Send } from "lucide-react";

type ChatPageProps = {
  threadId: string;
  initialMessages: MessageStrict[];
  availableTools: Array<{ slug: string; label: string }>;
};

export function ChatPage({
  threadId,
  initialMessages,
  availableTools,
}: ChatPageProps) {
  console.log("ChatPage", threadId);
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const { newMessage, setNewMessage, checkedTools, setCheckedTools } =
    useStore();
  const requiresHandleSubmit = useRef(false);
  const [processedToolInvocationMessages, setProcessedToolInvocationMessages] =
    useState<string[]>([]);
  const [collapsedTools, setCollapsedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialMessages.length === 0 && newMessage !== "") {
      initialMessages.push({
        id: "temp_id",
        role: "user",
        content: newMessage,
      });
      setNewMessage("");
      requiresHandleSubmit.current = true;
    }
    // If checkedTools is not initialized yet, initialize it
    if (Object.keys(checkedTools).length === 0) {
      const initialCheckedTools = availableTools.reduce<
        Record<string, boolean>
      >((acc, tool) => {
        acc[tool.slug] = true;
        return acc;
      }, {});
      initialCheckedTools["allchecked"] = true;
      setCheckedTools(initialCheckedTools);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  const {
    messages: messagesRaw,
    input,
    handleInputChange,
    handleSubmit,
    error,
    isLoading,
    setMessages: setMessagesRaw,
  } = useChat({
    api: `${env.NEXT_PUBLIC_BACKEND_URL}/qa/chat_streamed/${threadId}`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
    initialMessages,
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      const selectedTools = Object.keys(checkedTools).filter(
        (key) => key !== "allchecked" && checkedTools[key] === true,
      );
      return { content: lastMessage.content, tool_selection: selectedTools };
    },
  });

  const messages = messagesRaw as MessageStrict[];
  const setMessages = setMessagesRaw as (
    messages:
      | MessageStrict[]
      | ((messages: MessageStrict[]) => MessageStrict[]),
  ) => void;

  // Scroll to the end of the page when new messages are added
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const handleWheel = (event: React.WheelEvent) => {
    if (event.deltaY < 0) {
      setIsAutoScrollEnabled(false);
    } else {
      const container = containerRef.current;
      if (!container) return;
      const isAtBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 200;
      setIsAutoScrollEnabled(isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAutoScrollEnabled]);

  // Handle auto-submit if there's a single human message or all tools have been validated
  useEffect(() => {
    // Auto-submit if there's a single human message
    if (requiresHandleSubmit.current) {
      handleSubmit(undefined, { allowEmptySubmit: true });
      requiresHandleSubmit.current = false;
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      // Skip if we've already processed this message
      if (processedToolInvocationMessages.includes(lastMessage.id)) {
        return;
      }

      const annotations = lastMessage.annotations || [];

      // Count tools that were subject to HIL (accepted, rejected, or pending)
      const validatedCount = annotations.filter((a) =>
        ["accepted", "rejected", "pending"].includes(a.validated),
      ).length;

      // Count validated tools that also have results
      const validatedWithResultCount = lastMessage.toolInvocations.filter(
        (tool) => {
          const annotation = annotations.find(
            (a) => a.toolCallId === tool.toolCallId,
          );
          return (
            (annotation?.validated === "accepted" ||
              annotation?.validated === "rejected") &&
            tool.state === "result"
          );
        },
      ).length;

      if (validatedCount > 0 && validatedCount === validatedWithResultCount) {
        // Mark this message as processed
        setProcessedToolInvocationMessages((prev) => [...prev, lastMessage.id]);

        console.log(
          "All validated tools have results, triggering empty message",
        );
        handleSubmit(undefined, { allowEmptySubmit: true });
      }
    }
  }, [messages, handleSubmit, processedToolInvocationMessages]);

  // to toggle the collapse of tools
  function getMessageIndicesBetween(messageID: string) {
    const targetIndex = messages.findIndex((msg) => msg.id === messageID);
    if (targetIndex === -1) return [];

    let prevUserIndex = -1;
    for (let i = targetIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        prevUserIndex = i;
        break;
      }
    }
    return messages
      .slice(prevUserIndex !== -1 ? prevUserIndex + 1 : 0, targetIndex)
      .map((message) => message.id);
  }

  const toggleCollapse = (messageId: string[]) => {
    setCollapsedTools((prev) => {
      const newSet = new Set(prev);
      for (const id of messageId) {
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      }
      return newSet;
    });
  };

  if (error) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mesages list */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 flex flex-col overflow-y-auto"
      >
        {messages.map((message) =>
          message.role === "assistant" ? (
            message.toolInvocations ? (
              // Unpack the parralel tool calls
              message.toolInvocations
                .sort((a, b) => a.toolCallId.localeCompare(b.toolCallId))
                .map((tool) => {
                  const validated =
                    message.annotations?.find(
                      (a) => a.toolCallId === tool.toolCallId,
                    )?.validated ?? "not_required";

                  return (
                    !collapsedTools.has(message.id) && (
                      <ChatMessageTool
                        key={`${message.id}-${tool.toolCallId}`}
                        threadId={threadId}
                        tool={tool}
                        availableTools={availableTools}
                        validated={validated}
                        setMessage={(updater) => {
                          setMessages((messages) =>
                            messages.map((msg) =>
                              msg.id === message.id ? updater(msg) : msg,
                            ),
                          );
                        }}
                      />
                    )
                  );
                })
            ) : (
              <ChatMessageAI
                key={message.id}
                content={message.content}
                associatedToolsIncides={getMessageIndicesBetween(message.id)}
                collapsedTools={collapsedTools}
                toggleCollapse={toggleCollapse}
              />
            )
          ) : (
            <ChatMessageHuman key={message.id} content={message.content} />
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (
                  !(
                    isLoading ||
                    (messages.at(-1)?.toolInvocations ?? []).length > 0
                  )
                ) {
                  setIsAutoScrollEnabled(true);
                  handleSubmit(e);
                }
              }
            }}
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
                disabled={(messages.at(-1)?.toolInvocations ?? []).length > 0}
              >
                <Send className="opacity-50" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
