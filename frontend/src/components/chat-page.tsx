"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import type { MessageStrict } from "@/lib/types";
import { env } from "@/lib/env";
import { useSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";

import { ChatMessageAI } from "@/components/chat-message-ai";
import { ChatMessageHuman } from "@/components/chat-message-human";
import { ChatMessageTool } from "@/components/chat-message-tool";

type ChatPageProps = {
  threadId: string;
  initialMessages: MessageStrict[];
};

export function ChatPage({ threadId, initialMessages }: ChatPageProps) {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const { newMessage, setNewMessage } = useStore();
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
      return {
        content: lastMessage.content,
      };
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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const toggleCollapse = (messageId: string[], setAll: boolean = false) => {
    if (setAll) {
      if (collapsedTools?.size > 0) {
        setCollapsedTools(new Set());
      } else setCollapsedTools(new Set(messageId));
    } else {
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
    }
  };

  if (error) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex justify-center items-center p-6 w-full">
        <h1 className="text-3xl absolute"></h1>
        <Button
          className="hover:scale-105 active:scale-[1.10] ml-auto"
          onClick={() =>
            toggleCollapse(
              messages.map((msg) => msg.id),
              true,
            )
          }
        >
          {collapsedTools?.size > 0 ? "Show Tools" : "Hide Tools"}
        </Button>
      </div>
      {/* Mesages list */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {messages.map((message, idx) =>
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
                id={message.id}
                threadId={threadId}
                content={message.content}
                isLoading={isLoading && idx > initialMessages.length - 1}
                associatedToolsIncides={getMessageIndicesBetween(message.id)}
                collapsedTools={collapsedTools}
                toggleCollapse={toggleCollapse}
              />
            )
          ) : (
            <ChatMessageHuman
              key={message.id}
              id={message.id}
              threadId={threadId}
              content={message.content}
            />
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        className="flex flex-col justify-center items-center gap-4 mb-4"
        onSubmit={handleSubmit}
      >
        <div className="relative w-1/2">
          <input
            type="text"
            className="border-2 border-gray-500 w-full p-4 rounded-full"
            name="prompt"
            placeholder="Message the AI..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
