"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import type { Message } from "ai/react";
import { getSettings } from "@/lib/cookies-client";

import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat-message";

type ChatPageProps = {
  threadId: string;
  threadTitle: string;
  initialMessages: Message[];
};

const BACKEND_URL = "http://localhost:8000/qa/chat_streamed";

export function ChatPage({
  threadId,
  threadTitle,
  initialMessages,
}: ChatPageProps) {
  const { messages, input, handleInputChange, handleSubmit, error } = useChat({
    api: `${BACKEND_URL}/${threadId}`,
    headers: {
      Authorization: `Bearer ${getSettings().token}`,
    },
    initialMessages,
  });
  const [showTools, setShowTools] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div className="flex justify-center items-center border-b-4 p-4">
        <h1 className="text-3xl">{threadTitle}</h1>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto my-4">
        {messages.map((message) =>
          message.role === "assistant" ? (
            message.toolInvocations ? (
              message.toolInvocations.map(
                (tool) =>
                  showTools && (
                    <ChatMessage
                      key={`${message.id}-${tool.toolCallId}`}
                      id={message.id}
                      type="tool"
                      tool={{
                        name: tool.toolName,
                        state: tool.state,
                        args: tool.args,
                        result: "result" in tool ? tool.result : undefined,
                        id: tool.toolCallId,
                      }}
                    />
                  ),
              )
            ) : (
              <ChatMessage
                key={message.id}
                id={message.id}
                type="ai"
                content={message.content}
              />
            )
          ) : (
            <ChatMessage
              key={message.id}
              id={message.id}
              type="human"
              content={message.content}
            />
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex flex-col justify-center items-center gap-4 mb-4"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="border-2 border-gray-500 w-1/2 p-4 rounded-full"
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
      </form>
    </div>
  );
}
