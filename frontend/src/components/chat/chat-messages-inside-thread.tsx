import { MessageStrict } from "@/lib/types";
import { ChatMessageAI } from "./chat-message-ai";
import { ChatMessageHuman } from "./chat-message-human";
import { ChatMessageTool } from "./chat-message-tool";
import { useState, useMemo } from "react";

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

  // Memoize the associated tools computation
  const associatedTools = useMemo(
    () =>
      messages.reduce((toolMap, message, index) => {
        if (message.role === "assistant" && !message.toolInvocations) {
          const toolIds = new Set<string>();
          for (let i = index - 1; i >= 0; i--) {
            if (messages[i].role === "user") break;
            const msg = messages[i];
            if (msg?.role === "assistant" && msg.toolInvocations?.length) {
              msg.toolInvocations.forEach(() => toolIds.add(msg.id));
            }
          }
          toolMap.set(message.id, toolIds);
        }
        return toolMap;
      }, new Map<string, Set<string>>()),
    [messages],
  );

  const toggleFunctions = useMemo(() => {
    const functionMap = new Map<string, () => void>();

    messages.forEach((message) => {
      if (message.role === "assistant" && !message.toolInvocations) {
        const toolsToToggle = associatedTools.get(message.id);
        if (!toolsToToggle) return;

        functionMap.set(message.id, () => {
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
        });
      }
    });

    return functionMap;
  }, [messages, associatedTools]);

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
              hasTools={(associatedTools.get(message.id)?.size ?? 0) > 0}
              toolsCollapsed={Array.from(
                associatedTools.get(message.id) || [],
              ).some((id) => collapsedTools.has(id))}
              toggleCollapse={toggleFunctions.get(message.id) ?? (() => {})}
            />
          )
        ) : (
          <ChatMessageHuman key={message.id} content={message.content} />
        ),
      )}
    </>
  );
}
