"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import type { Message } from "ai/react";
import { getSettings } from "@/lib/cookies-client";
import { env } from "@/lib/env";

import { Button } from "@/components/ui/button";
import { ChatMessageAI } from "@/components/chat-message-ai";
import { ChatMessageHuman } from "@/components/chat-message-human";
import { ChatMessageTool } from "@/components/chat-message-tool";

type ChatPageProps = {
  threadId: string;
  threadTitle: string;
  initialMessages: Message[];
};

export function ChatPage({
  threadId,
  threadTitle,
  initialMessages,
}: ChatPageProps) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    isLoading,
    setMessages,
  } = useChat({
    api: `${env.BACKEND_URL}/qa/chat_streamed/${threadId}`,
    headers: {
      Authorization: `Bearer ${getSettings().token}`,
    },
    initialMessages,
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      return {
        content: lastMessage.content,
      };
    },
  });
  const [showTools, setShowTools] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [processedToolInvocationMessages, setProcessedToolInvocationMessages] =
    useState<string[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      // Skip if we've already processed this message
      if (processedToolInvocationMessages.includes(lastMessage.id)) {
        return;
      }

      const annotations =
        (lastMessage.annotations as Array<{
          toolCallId: string;
          validated: string;
        }>) || [];

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
        handleSubmit(new Event("submit") as any, { allowEmptySubmit: true });
      }
    }
  }, [messages, handleSubmit, processedToolInvocationMessages]);

  if (error) {
    console.log("Error", error);
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end items-center p-4">
        <Button
          className="hover:scale-105 active:scale-[1.10]"
          onClick={() => setShowTools(!showTools)}
        >
          {showTools ? "Hide Tools" : "Show Tools"}
        </Button>
      </div>
      <div className="flex justify-center items-center border-b-2 p-4">
        <h1 className="text-3xl">{threadTitle}</h1>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto my-4">
        {messages.map((message) =>
          message.role === "assistant" ? (
            message.toolInvocations ? (
              message.toolInvocations
                .sort((a, b) => a.toolCallId.localeCompare(b.toolCallId))
                .map(
                  (tool) =>
                    showTools && (
                      <ChatMessageTool
                        key={`${message.id}-${tool.toolCallId}`}
                        id={message.id}
                        threadId={threadId}
                        tool={{
                          name: tool.toolName,
                          state: tool.state,
                          args: tool.args,
                          result: "result" in tool ? tool.result : undefined,
                          id: tool.toolCallId,
                          hil:
                            (
                              message.annotations as Array<{
                                toolCallId: string;
                                validated: string;
                              }>
                            )?.find((a) => a.toolCallId === tool.toolCallId)
                              ?.validated ?? "not_required",
                        }}
                        setMessage={(updater) => {
                          setMessages((messages) =>
                            messages.map((msg) =>
                              msg.id === message.id ? updater(msg) : msg,
                            ),
                          );
                        }}
                      />
                    ),
                )
            ) : (
              <ChatMessageAI
                key={message.id}
                id={message.id}
                threadId={threadId}
                content={message.content}
                setMessage={(updater) => {
                  setMessages((messages) =>
                    messages.map((msg) =>
                      msg.id === message.id ? updater(msg) : msg,
                    ),
                  );
                }}
              />
            )
          ) : (
            <ChatMessageHuman
              key={message.id}
              id={message.id}
              threadId={threadId}
              content={message.content}
              setMessage={(updater) => {
                setMessages((messages) =>
                  messages.map((msg) =>
                    msg.id === message.id ? updater(msg) : msg,
                  ),
                );
              }}
            />
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

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
