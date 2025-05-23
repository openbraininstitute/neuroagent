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
    const toolsToToggle = associatedTools.get(messageId);
    if (!toolsToToggle) return;

    setCollapsedTools((prev) => {
      const newSet = new Set(prev);
      for (const id of toolsToToggle) {
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      }
      return newSet;
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
          message.toolInvocations ? (
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
                      stopped={
                        message.annotations?.some(
                          (annotation) =>
                            annotation.isComplete !== undefined &&
                            !annotation.isComplete,
                        ) ?? false
                      }
                      availableTools={availableTools}
                      validated={validated}
                      setMessage={(updater) =>
                        handleMessageUpdate(message.id, updater)
                      }
                    />
                  )
                );
              })
          ) : (
            <div key={message.id}>
              <ChatMessageAI
                key={message.id}
                messageId={message.id}
                content={message.content}
                hasTools={(associatedTools.get(message.id)?.size ?? 0) > 0}
                toolsCollapsed={Array.from(
                  associatedTools.get(message.id) || [],
                ).some((id) => collapsedTools.has(id))}
                toggleCollapse={() => handleToggleCollapse(message.id)}
              />
              <PlotsInChat
                storageIds={Array.from(
                  associatedStorageID.get(message.id) || [],
                )}
              />
            </div>
          )
        ) : (
          <ChatMessageHuman key={message.id} content={message.content} />
        ),
      )}
    </>
  );
}
