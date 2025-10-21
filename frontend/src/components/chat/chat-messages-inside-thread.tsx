"use client";

import { MessageStrict } from "@/lib/types";
import {
  getLastText,
  getStorageID,
  getValidationStatus,
  isToolPart,
} from "@/lib/utils";
import PlotsInChat from "@/components/chat/plot-in-chat";
import { ChatMessageAI } from "@/components/chat/chat-message-ai";
import { ChatMessageHuman } from "@/components/chat/chat-message-human";
import { ChatMessageTool } from "@/components/chat/chat-message-tool";
import { ChatMessageLoading } from "./chat-message-loading";
import { ReasoningCollapsible } from "./reasoning-collapsible";

type ChatMessagesInsideThreadProps = {
  messages: MessageStrict[];
  threadId: string;
  availableTools: Array<{ slug: string; label: string }>;
  addToolResult: <TOOL extends string>({
    state,
    tool,
    toolCallId,
    output,
    errorText,
  }:
    | {
        state?: "output-available";
        tool: TOOL;
        toolCallId: string;
        output: unknown;
        errorText?: never;
      }
    | {
        state: "output-error";
        tool: TOOL;
        toolCallId: string;
        output?: never;
        errorText: string;
      }) => Promise<void>;
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
  const handleMessageUpdate = (
    messageId: string,
    updater: (msg: MessageStrict) => MessageStrict,
  ) => {
    setMessages((messages) =>
      messages.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
    );
  };
  console.log(messages);
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
                  .map((part) => part.text)}
                messageId={message.id}
                isReasoning={
                  !(loadingStatus === "ready") && idx === messages.length - 1
                }
              />
            )}
            {message.parts?.map((part, partId) => {
              if (isToolPart(part)) {
                const validated =
                  getValidationStatus(message.metadata, part.toolCallId) ??
                  "not_required";
                return (
                  <div key={`${message.id}-tool-${part.toolCallId}`}>
                    <ChatMessageTool
                      threadId={threadId}
                      tool={part}
                      stopped={
                        message.metadata?.some((e) => e.isComplete === false) ??
                        false
                      }
                      availableTools={availableTools}
                      addToolResult={addToolResult}
                      validated={validated}
                      setMessage={(updater) =>
                        handleMessageUpdate(message.id, updater)
                      }
                    />
                    <PlotsInChat storageIds={getStorageID(part) || []} />
                  </div>
                );
              }
              if (part.type === "text" && part.text !== "") {
                return (
                  <ChatMessageAI
                    key={`${message.id}-text-${partId}`}
                    messageId={message.id}
                    content={part.text}
                  />
                );
              }
              return null;
            })}
          </div>
        ) : (
          <ChatMessageHuman key={message.id} content={getLastText(message)} />
        ),
      )}
      {loadingStatus !== "ready" && <ChatMessageLoading />}
    </>
  );
}
