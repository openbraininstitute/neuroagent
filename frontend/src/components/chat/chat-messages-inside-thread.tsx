import { MessageStrict } from "@/lib/types";
import { ChatMessageAI } from "./chat-message-ai";
import { ChatMessageHuman } from "./chat-message-human";
import { ChatMessageTool } from "./chat-message-tool";
import { useEffect, useRef, useState } from "react";

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
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [collapsedTools, setCollapsedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="flex-1 flex flex-col overflow-y-auto"
    >
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
              associatedToolsIndices={getMessageIndicesBetween(message.id)}
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
  );
}
