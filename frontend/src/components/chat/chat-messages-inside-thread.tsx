"use client";

import { MessageStrict } from "@/lib/types";
import {
  getStoppedStatus,
  getStorageIDs,
  getValidationStatus,
} from "@/lib/utils";
import PlotsInChat from "@/components/chat/plot-in-chat";
import { ChatMessageAI } from "@/components/chat/chat-message-ai";
import { ChatMessageHuman } from "@/components/chat/chat-message-human";
import { ChatMessageTool } from "@/components/chat/chat-message-tool";
import { useState } from "react";
import { ChatMessageLoading } from "./chat-message-loading";
import { ReasoningCollapsible } from "./reasoning-collapsible";

type ChatMessagesInsideThreadProps = {
  messages: MessageStrict[];
  threadId: string;
  availableTools: Array<{ slug: string; label: string }>;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any;
  }) => void;
  setMessages: (
    messages:
      | MessageStrict[]
      | ((messages: MessageStrict[]) => MessageStrict[]),
  ) => void;
  loadingStatus: "submitted" | "streaming" | "ready" | "error";
};

export function ChatMessagesInsideThread({
  messages,
  threadId,
  availableTools,
  addToolResult,
  setMessages,
  loadingStatus,
}: ChatMessagesInsideThreadProps) {
  const [collapsedTools, setCollapsedTools] = useState<Set<string>>(new Set());

  const handleToggleCollapse = (messageId: string) => {
    setCollapsedTools((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleMessageUpdate = (
    messageId: string,
    updater: (msg: MessageStrict) => MessageStrict,
  ) => {
    setMessages((messages) =>
      messages.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
    );
  };

  return (
    <>
      {messages.map((message, idx) =>
        message.role === "assistant" ? (
          <div key={message.id}>
            {message.parts.some((part) => part.type === "reasoning") && (
              <ReasoningCollapsible
                key={`${message.id}-reasoning`}
                reasoningSteps={message.parts
                  ?.filter((part) => part.type === "reasoning")
                  .map((part) => part.reasoning)}
                messageId={message.id}
                isReasoning={
                  !(loadingStatus === "ready") && idx === messages.length - 1
                }
              />
            )}
            {message.parts?.map((part) => {
              if (
                !collapsedTools.has(message.id) &&
                part.type === "tool-invocation"
              ) {
                const validated =
                  getValidationStatus(
                    message.annotations,
                    part.toolInvocation.toolCallId,
                  ) ?? "not_required";
                const stopped = getStoppedStatus(
                  message.annotations,
                  part.toolInvocation.toolCallId,
                );
                return (
                  <ChatMessageTool
                    key={`${message.id}-tool-${part.toolInvocation.toolCallId}`}
                    threadId={threadId}
                    tool={part.toolInvocation}
                    stopped={stopped}
                    availableTools={availableTools}
                    addToolResult={addToolResult}
                    validated={validated}
                    setMessage={(updater) =>
                      handleMessageUpdate(message.id, updater)
                    }
                  />
                );
              }
              return null;
            })}

            <ChatMessageAI
              messageId={message.id}
              content={message.content}
              hasTools={
                message.parts?.some(
                  (part) => part.type === "tool-invocation",
                ) ?? false
              }
              isToolsCollapsed={collapsedTools.has(message.id)}
              toggleCollapse={() => handleToggleCollapse(message.id)}
              isLoading={
                loadingStatus === "submitted" || loadingStatus === "streaming"
              }
              isLastMessage={idx === messages.length - 1}
            />

            {/* Render any plots */}
            <PlotsInChat storageIds={getStorageIDs(message) || []} />
          </div>
        ) : (
          <ChatMessageHuman key={message.id} content={message.content} />
        ),
      )}
      {loadingStatus === "submitted" && <ChatMessageLoading />}
    </>
  );
}
