"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import { BMessage, BMessageUser, type MessageStrict } from "@/lib/types";
import { env } from "@/lib/env";
import { useSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { ChatInputInsideThread } from "@/components/chat/chat-input-inside-thread";
import { ChatMessagesInsideThread } from "@/components/chat/chat-messages-inside-thread";
import { generateEditTitle } from "@/actions/generate-edit-thread";
import { toast } from "sonner";
import { useGetMessageNextPage } from "@/hooks/get-message-page";
import { convertToAiMessages } from "@/lib/utils";
import { md5 } from "js-md5";

type ChatPageProps = {
  threadId: string;
  initialMessages: BMessage[];
  initialNextCursor?: string;
  availableTools: Array<{ slug: string; label: string }>;
};

export function ChatPage({
  threadId,
  initialMessages,
  initialNextCursor,
  availableTools,
}: ChatPageProps) {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const newMessage = useStore((state) => state.newMessage);
  const checkedTools = useStore((state) => state.checkedTools);
  const setNewMessage = useStore((state) => state.setNewMessage);
  const setCheckedTools = useStore((state) => state.setCheckedTools);
  const [processedToolInvocationMessages, setProcessedToolInvocationMessages] =
    useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stopped, setStopped] = useState(false);
  const [isInvalidating, setIsInvalidating] = useState(false);

  const {
    data,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isFetching,
  } = useGetMessageNextPage(threadId, {
    pages: [
      {
        messages: initialMessages,
        nextCursor: initialNextCursor,
      },
    ],
    pageParams: [null],
  });

  const retrievedMessages = convertToAiMessages(
    data?.pages.flatMap((page) => page.messages) ?? [],
  );

  const {
    messages: messagesRaw,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages: setMessagesRaw,
    error,
    stop,
  } = useChat({
    api: `${env.NEXT_PUBLIC_BACKEND_URL}/qa/chat_streamed/${threadId}`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
    initialMessages: retrievedMessages,
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      const selectedTools = Object.keys(checkedTools).filter(
        (key) => key !== "allchecked" && checkedTools[key] === true,
      );
      return { content: lastMessage.content, tool_selection: selectedTools };
    },
  });

  const messages = messagesRaw as MessageStrict[];
  const setMessages = setMessagesRaw as (
    messages:
      | MessageStrict[]
      | ((messages: MessageStrict[]) => MessageStrict[]),
  ) => void;

  // Moved useEffect here to group with other useEffect hooks
  useEffect(() => {
    if (initialMessages.length === 0 && newMessage !== "") {
      initialMessages.push({
        entity: "user",
        message_id: "temp_id",
        msg_content: {
          role: "user",
          content: newMessage,
        },
        creation_date: new Date().toString(),
        thread_id: threadId,
        is_complete: true,
        tool_calls: [],
      } as BMessageUser);
      generateEditTitle(null, threadId, newMessage);
      setNewMessage("");
      handleSubmit(undefined, { allowEmptySubmit: true });
    }
    // If checkedTools is not initialized yet, initialize it
    if (Object.keys(checkedTools).length === 0) {
      const initialCheckedTools = availableTools.reduce<
        Record<string, boolean>
      >((acc, tool) => {
        acc[tool.slug] = true;
        return acc;
      }, {});
      initialCheckedTools["allchecked"] = true;
      setCheckedTools(initialCheckedTools);
    }
    // To know if the chat should be disabled or not, check if last message was stopped
    const shouldBeStopped = () => {
      const isLastMessageComplete =
        messages.at(-1)?.annotations?.find(
          (annotation) => "isComplete" in annotation, // Find the correct annotation
        )?.isComplete ?? false;
      return !isLastMessageComplete;
    }; // If message complete, don't set stopped

    setStopped(shouldBeStopped());

    // Ping the scroll mechanism to trigger page retrieval
    // if not scrollable with first page
    const el = containerRef.current!;
    if (el.scrollHeight <= el.clientHeight + 40) {
      handleScroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (isInvalidating || isFetching) return;
    // Set retrieved DB messaged as current messages
    if (!stopped) {
      setMessages(() => [
        ...retrievedMessages,
        ...messages.filter((m) => m.id.length !== 32),
      ]);
    } else {
      setMessages(retrievedMessages);
    }
  }, [md5(JSON.stringify(retrievedMessages))]); // Rerun on content change

  useEffect(() => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, isAutoScrollEnabled]);

  // Handle auto-submit if there's a single human message or all tools have been validated
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      // Skip if we've already processed this message
      if (processedToolInvocationMessages.includes(lastMessage.id)) {
        return;
      }

      const annotations = lastMessage.annotations || [];

      // Count tools that were subject to HIL (accepted, rejected, or pending)
      const validatedCount = annotations.filter((a) =>
        ["accepted", "rejected", "pending"].includes(a.validated ?? ""),
      ).length;

      // Count validated tools that also have results
      const validatedWithResultCount = lastMessage.toolInvocations.filter(
        (tool) => {
          const annotation = annotations.find(
            (a) => a.toolCallId === tool.toolCallId,
          );
          return (
            (annotation?.validated === "accepted" ||
              annotation?.validated === "rejected") &&
            tool.state === "result"
          );
        },
      ).length;

      if (validatedCount > 0 && validatedCount === validatedWithResultCount) {
        // Mark this message as processed
        setProcessedToolInvocationMessages((prev) => [...prev, lastMessage.id]);

        console.log(
          "All validated tools have results, triggering empty message",
        );
        handleSubmit(undefined, { allowEmptySubmit: true });
      }
    }
  }, [messages, handleSubmit, processedToolInvocationMessages]);

  const hasOngoingToolInvocations =
    (messages.at(-1)?.toolInvocations ?? []).length > 0;

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

  // Handle streaming interruption
  useEffect(() => {
    if (stopped) {
      setMessages((prevState) => {
        prevState[prevState.length - 1] = {
          ...prevState[prevState.length - 1],
          annotations: [{ isComplete: false }],
        };
        return prevState;
      });
    }
  }, [stopped, setMessages]);

  // Handle chat errors
  useEffect(() => {
    if (!error) return;

    // Remove the last message if it's from a human
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      setMessages(messages.slice(0, -1));
    }

    let errorDetail;
    try {
      // Try to parse error message as JSON
      errorDetail = JSON.parse(error.message);
    } catch {
      errorDetail = { message: error.message };
    }

    if (errorDetail?.detail?.error === "Rate limit exceeded") {
      const retryAfterSeconds = errorDetail.detail.retry_after;
      const retryAfterHours = Math.ceil(retryAfterSeconds / 3600);

      toast.error("Rate Limit Exceeded", {
        description: `Please try again in ${retryAfterHours} ${
          retryAfterHours === 1 ? "hour" : "hours"
        }.`,
      });
    } else {
      toast.error("Chat Error", {
        description: errorDetail.message || "An unknown error occurred",
      });
    }
  }, [error, messages, setMessages]);

  // Fetch next page and avoid jumping to earlier messages
  const handleScroll = async () => {
    const el = containerRef.current!;

    // translates to: (scrolled to top OR window not full of messages) AND more pages left AND not currently fetching
    const shouldTryLoad =
      (el.scrollTop === 0 || el.scrollHeight <= el.clientHeight + 40) &&
      hasPreviousPage &&
      !isFetchingPreviousPage &&
      !isLoading;

    if (!shouldTryLoad) return;
    let prevPageCount = data?.pages.length ?? 0;
    while (true) {
      const oldHeight = el.scrollHeight + 40;
      const result = await fetchPreviousPage();
      await new Promise(requestAnimationFrame);
      // bump scroll so the user stays in place
      el.scrollTop = el.scrollHeight - oldHeight;

      // Check if we got a new page
      const newPageCount = result.data?.pages.length ?? prevPageCount;
      if (newPageCount === prevPageCount) break;
      prevPageCount = newPageCount;

      // Check if the container is tall enough
      if (el.scrollHeight > el.clientHeight + 40) break;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {isFetchingPreviousPage && (
        <div className="mx-auto mt-4 h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
      )}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onScroll={handleScroll}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <ChatMessagesInsideThread
          messages={messages}
          threadId={threadId}
          availableTools={availableTools}
          setMessages={setMessages}
        />
        <div ref={messagesEndRef} />
      </div>

      <ChatInputInsideThread
        input={input}
        isLoading={isLoading}
        availableTools={availableTools}
        checkedTools={checkedTools}
        threadId={threadId}
        setCheckedTools={setCheckedTools}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        hasOngoingToolInvocations={hasOngoingToolInvocations}
        setIsAutoScrollEnabled={setIsAutoScrollEnabled}
        onStop={stop}
        stopped={stopped}
        setStopped={setStopped}
        setIsInvalidating={setIsInvalidating}
      />
    </div>
  );
}
