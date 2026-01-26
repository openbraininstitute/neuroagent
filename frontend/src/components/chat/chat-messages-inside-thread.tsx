"use client";

import { MessageStrict } from "@/lib/types";
import {
  getStoppedStatus,
  getStorageID,
  getValidationStatus,
  getLastTextContent,
  isStorageIdInText,
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
      {messages.map((message, idx) => {
        const isStreamingLastMsg =
          loadingStatus !== "ready" && idx === messages.length - 1;
        const textContent = getLastTextContent(message);
        const allMsgStorageIds =
          message.parts
            ?.filter((p) => p.type === "tool-invocation")
            .flatMap((p) => getStorageID(p)) || [];

        return message.role === "assistant" ? (
          <div key={message.id}>
            {message.parts.some((part) => part.type === "reasoning") && (
              <ReasoningCollapsible
                key={`${message.id}-reasoning`}
                reasoningSteps={message.parts
                  ?.filter((part) => part.type === "reasoning")
                  .map((part) => part.reasoning)}
                messageId={message.id}
                isReasoning={isStreamingLastMsg}
              />
            )}
            {message.parts?.map((part, partId) => {
              if (part.type === "tool-invocation") {
                const validated =
                  getValidationStatus(
                    message.annotations,
                    part.toolInvocation.toolCallId,
                  ) ?? "not_required";
                const stopped = getStoppedStatus(
                  message.annotations,
                  part.toolInvocation.toolCallId,
                );
                const storageIds = getStorageID(part) || [];
                const shouldShowBackup =
                  !isStreamingLastMsg &&
                  storageIds.length > 0 &&
                  !isStorageIdInText(textContent, storageIds);

                return (
                  <div
                    key={`${message.id}-tool-${part.toolInvocation.toolCallId}`}
                  >
                    <ChatMessageTool
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
                    {shouldShowBackup && (
                      <PlotsInChat storageIds={storageIds} />
                    )}
                  </div>
                );
              }
              if (part.type === "text" && part.text !== "") {
                return (
                  <ChatMessageAI
                    key={`${message.id}-text-${partId}`}
                    messageId={message.id}
                    content={part.text}
                    validStorageIds={allMsgStorageIds}
                  />
                );
              }
              return null;
            })}
          </div>
        ) : (
          <ChatMessageHuman key={message.id} content={message.content} />
        );
      })}
      {loadingStatus !== "ready" && <ChatMessageLoading />}
    </>
  );
}
