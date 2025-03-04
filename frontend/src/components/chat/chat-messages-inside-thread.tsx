import { MessageStrict } from "@/lib/types";
import { getAssociatedTools } from "@/lib/utils";
import { ChatMessageAI } from "./chat-message-ai";
import { ChatMessageHuman } from "./chat-message-human";
import { ChatMessageTool } from "./chat-message-tool";
import { useState, useMemo, useCallback } from "react";

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

  // Use the utility function in useMemo
  const associatedTools = useMemo(
    () => getAssociatedTools(messages),
    [messages],
  );

  // Create a callback for toggling tool visibility
  const toggleToolVisibility = useCallback(
    (messageId: string) => {
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
    },
    [associatedTools],
  );

  // Create toggle functions map using the callback
  const toggleFunctions = useMemo(() => {
    const functionMap = new Map<string, () => void>();
    messages.forEach((message) => {
      if (message.role === "assistant" && !message.toolInvocations) {
        if (associatedTools.has(message.id)) {
          functionMap.set(message.id, () => toggleToolVisibility(message.id));
        }
      }
    });
    return functionMap;
  }, [messages, toggleToolVisibility]);

  // Memoize message updaters
  const messageUpdaters = useMemo(() => {
    const updaterMap = new Map<
      string,
      (updater: (msg: MessageStrict) => MessageStrict) => void
    >();

    messages.forEach((message) => {
      if (message.role === "assistant" && message.toolInvocations) {
        updaterMap.set(
          message.id,
          (updater: (msg: MessageStrict) => MessageStrict) => {
            setMessages((messages) =>
              messages.map((msg) =>
                msg.id === message.id ? updater(msg) : msg,
              ),
            );
          },
        );
      }
    });

    return updaterMap;
  }, [messages, setMessages]);

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
                      setMessage={messageUpdaters.get(message.id)!}
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
