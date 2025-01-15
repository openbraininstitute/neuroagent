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
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const initializeToken = async () => {
      const settings = getSettings();
      setToken(settings.token);
    };
    initializeToken();
  }, []);

  const { messages, input, handleInputChange, handleSubmit, error } = useChat({
    api: `${BACKEND_URL}/${threadId}`,
    headers: {
      Authorization: `Bearer ${token}`,
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
      <div className="flex flex-col overflow-auto my-4">
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
        className="flex rounded-lg py-4 gap-8 border-4 mt-auto justify-center items-center"
        onSubmit={handleSubmit}
      >
        <textarea
          className="rounded-lg p-4 border-2 w-3/5"
          rows={2}
          name="prompt"
          value={input}
          onChange={handleInputChange}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
