"use client";

import { MessageStrict } from "@/lib/types";
import { getAssociatedTools, getViewableToolStorageIds } from "@/lib/utils";
import PlotsInChat from "@/components/chat/plot-in-chat";
import { ChatMessageAI } from "@/components/chat/chat-message-ai";
import { ChatMessageHuman } from "@/components/chat/chat-message-human";
import { ChatMessageTool } from "@/components/chat/chat-message-tool";
import { useState } from "react";

interface ChatMessagesInsideThreadProps {
  messages: MessageStrict[];
  threadId: string;
  availableTools: Array<{ slug: string; label: string }>;
  setMessages: (
    messages:
      | MessageStrict[]
      | ((messages: MessageStrict[]) => MessageStrict[]),
  ) => void;
}

export function ChatMessagesInsideThread({
  messages,
  threadId,
  availableTools,
  setMessages,
}: ChatMessagesInsideThreadProps) {
  const [collapsedTools, setCollapsedTools] = useState<Set<string>>(new Set());

  const associatedTools = getAssociatedTools(messages);
  const associatedStorageID = getViewableToolStorageIds(
    messages,
    associatedTools,
  );

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
      {messages.map((message) =>
        message.role === "assistant" ? (
          <div key={message.id}>
            {!collapsedTools.has(message.id) &&
              message.parts?.map((part) => {
                if (part.type == "tool-invocation") {
                  const validated =
                    message.annotations?.find(
                      (a) => a.toolCallId === part.toolInvocation.toolCallId,
                    )?.validated ?? "not_required";
                  const stopped =
                    message.annotations?.some(
                      (annotation) =>
                        annotation.isComplete !== undefined &&
                        !annotation.isComplete,
                    ) ?? false;

                  return (
                    <ChatMessageTool
                      key={`${message.id}-tool-${part.toolInvocation.toolCallId}`}
                      threadId={threadId}
                      tool={part.toolInvocation}
                      stopped={stopped}
                      availableTools={availableTools}
                      validated={validated}
                      setMessage={(updater) =>
                        handleMessageUpdate(message.id, updater)
                      }
                    />
                  );
                }
              })}

            {message.content && (
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
              />
            )}
            <PlotsInChat
              storageIds={Array.from(associatedStorageID.get(message.id) || [])}
            />
          </div>
        ) : (
          <ChatMessageHuman key={message.id} content={message.content} />
        ),
      )}
    </>
  );
}
