"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BMessage, type MessageStrict } from "@/lib/types";
import { env } from "@/lib/env";
import { useSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { ChatInputInsideThread } from "@/components/chat/chat-input-inside-thread";
import { ChatMessagesInsideThread } from "@/components/chat/chat-messages-inside-thread";
import { generateEditTitle } from "@/actions/generate-edit-thread";
import { toast } from "sonner";
import { useGetMessageNextPage } from "@/hooks/get-message-page";
import {
  convertToAiMessages,
  getToolInvocations,
  isLastMessageComplete,
} from "@/lib/utils";
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
  // Auth and store data
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const setCheckedTools = useStore((state) => state.setCheckedTools);
  const checkedTools = useStore((state) => state.checkedTools);
  // New conversation variables
  const newMessage = useStore((state) => state.newMessage);
  const setNewMessage = useStore((state) => state.setNewMessage);
  const hasSendFirstMessage = useRef(false);
  // Scrolling and pagination
  const prevHeight = useRef(0);
  const prevScroll = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stopping streaming
  const [stopped, setStopped] = useState(false);
  const [isInvalidating, setIsInvalidating] = useState(false);

  const {
    data,
    fetchPreviousPage,
    isFetchingPreviousPage,
    hasNextPage,
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

  // translate all messages to vercel, useMemo to fix infinite loop.
  const retrievedMessages = useMemo(() => {
    return convertToAiMessages(
      data?.pages.flatMap((page) => page.messages) ?? [],
    );
  }, [data?.pages]);

  const {
    addToolResult,
    append,
    error,
    messages: messagesRaw,
    handleInputChange,
    handleSubmit,
    input,
    setMessages: setMessagesRaw,
    status,
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

  // This should probably be changed to be more granular, I just created the old behaviour here.
  const isLoading = status == "streaming" || status == "submitted";

  // Convert to our types.
  const messages = messagesRaw as MessageStrict[];
  const setMessages = setMessagesRaw as (
    messages:
      | MessageStrict[]
      | ((messages: MessageStrict[]) => MessageStrict[]),
  ) => void;

  // Initial use effect that runs on mount
  useEffect(() => {
    // Send new message when new chat.
    if (
      initialMessages.length === 0 &&
      newMessage !== "" &&
      !hasSendFirstMessage.current
    ) {
      hasSendFirstMessage.current = true;
      append({
        id: "temp_id",
        role: "user",
        content: newMessage,
      });
      generateEditTitle(null, threadId, newMessage);
      setNewMessage("");
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

    // If message complete, don't set stopped
    setStopped(!isLastMessageComplete(messages.at(-1)));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle streaming interruption
  useEffect(() => {
    if (stopped) {
      setMessages((prevState) => {
        prevState[prevState.length - 1] = {
          ...prevState[prevState.length - 1],
          annotations: prevState
            .at(-1)
            ?.annotations?.map((ann) =>
              !ann.toolCallId ? { isComplete: false } : ann,
            ),
        };
        // We only change the annotation at message level and keep the rest.
        return prevState;
      });
    }
  }, [stopped, setMessages]);

  useEffect(() => {
    if (isInvalidating || isFetching) return;
    // Set retrieved DB messaged as current messages
    if (!stopped) {
      setMessages(() => [
        ...retrievedMessages,
        ...messages.filter(
          (m) => m.id.length !== 32 && !m.id.startsWith("temp"),
        ),
      ]);
    } else {
      setMessages(retrievedMessages);
    }
  }, [md5(JSON.stringify(retrievedMessages))]); // Rerun on content change

  // Constant to check if there are tool calls at the end of conv.
  const hasOngoingToolInvocations =
    (getToolInvocations(messages.at(-1)) ?? []).length > 0 &&
    messages.at(-1)?.content == "";

  // Auto scroll when streaming
  useEffect(() => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, isAutoScrollEnabled]);

  // Check for user inputs to stop auto scroll
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

  // Observer to fetch new pages :
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      async (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingPreviousPage &&
          !isLoading
        ) {
          const el = containerRef.current!;
          prevHeight.current = el.scrollHeight;
          prevScroll.current = el.scrollTop;
          if (!hasNextPage) return;
          await fetchPreviousPage();
          if (!isFetchingPreviousPage && !isLoading && prevHeight.current) {
            requestAnimationFrame(() => {
              const heightDiff = el.scrollHeight - prevHeight.current;
              el.scrollTop = prevScroll.current + heightDiff - 40;
            });
          }
        }
      },
      {
        root: containerRef.current,
      },
    );
    const sentinel = topSentinelRef.current;
    if (sentinel && observerRef.current) observerRef.current.observe(sentinel);

    // Remove intersection listener when unmounted
    return () => {
      if (sentinel && observerRef.current)
        observerRef.current.unobserve(sentinel);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasNextPage, isFetchingPreviousPage, isLoading, fetchPreviousPage]);

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

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div ref={topSentinelRef} className="h-1 w-full" />

        {isFetchingPreviousPage && (
          <div className="z-50 mx-auto mt-4 h-6 min-h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
        )}

        <ChatMessagesInsideThread
          messages={messages}
          threadId={threadId}
          availableTools={availableTools}
          addToolResult={addToolResult}
          setMessages={setMessages}
          isLoading={isLoading}
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
