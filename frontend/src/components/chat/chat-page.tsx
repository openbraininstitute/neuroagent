"use client";

import Cookies from "js-cookie";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { BMessage, LLMModel, type MessageStrict } from "@/lib/types";
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
  getLastMessageText,
  getLastText,
  getToolInvocations,
  isLastMessageComplete,
  lastAssistantHasAllToolOutputs,
} from "@/lib/utils";
import { DefaultChatTransport } from "ai";

type ChatPageProps = {
  threadId: string;
  initialMessages: BMessage[];
  initialNextCursor?: string;
  availableTools: Array<{ slug: string; label: string }>;
  availableModels: Array<LLMModel>;
};

export function ChatPage({
  threadId,
  initialMessages,
  initialNextCursor,
  availableTools,
  availableModels,
}: ChatPageProps) {
  // Auth and store data
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const setCheckedTools = useStore((state) => state.setCheckedTools);
  const checkedTools = useStore((state) => state.checkedTools);
  const setCurrentModel = useStore((state) => state.setCurrentModel);
  const currentModel = useStore((state) => state.currentModel);
  // New conversation variables
  const newMessage = useStore((state) => state.newMessage);
  const setNewMessage = useStore((state) => state.setNewMessage);
  const hasSendFirstMessage = useRef(false);
  // Scrolling and pagination
  const observerRef = useRef<IntersectionObserver | null>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stopping streaming
  const [stopped, setStopped] = useState(false);
  const [isInvalidating, setIsInvalidating] = useState(false);
  // For frontend url
  const frontendUrl = Cookies.get("frontendUrl") || "";

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

  const retrievedMessages = data?.pages.flatMap((page) => page.messages) ?? [];

  const {
    addToolResult,
    error,
    messages: messagesRaw,
    setMessages: setMessagesRaw,
    sendMessage,
    status,
    stop,
  } = useChat({
    messages: retrievedMessages,
    experimental_throttle: 50,
    sendAutomaticallyWhen: lastAssistantHasAllToolOutputs,
    transport: new DefaultChatTransport({
      api: `${env.NEXT_PUBLIC_BACKEND_URL}/qa/chat_streamed/${threadId}`,
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
      prepareSendMessagesRequest: ({ messages }) => {
        const checkedToolsNow = useStore.getState().checkedTools;
        const currentModelNow = useStore.getState().currentModel;
        return {
          body: {
            content: getLastMessageText(messages),
            tool_selection: Object.keys(checkedToolsNow).filter(
              (key) => key !== "allchecked" && checkedToolsNow[key] === true,
            ),
            model: currentModelNow.id,
            frontend_url: frontendUrl,
          },
        };
      },
    }),
  });

  // Handle chat inputs.
  const [input, setInput] = useState("");
  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

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
      sendMessage({ text: newMessage });
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

  useEffect(() => {
    if (isInvalidating || isFetching) return;
    // Set retrieved DB messaged as current messages
    if (!stopped) {
      setMessages(() => [
        ...retrievedMessages,
        ...messages.filter(
          (m) => m.id.length !== 36 && !m.id.startsWith("msg"),
        ),
      ]);
    } else {
      setMessages(retrievedMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvalidating, isFetching]); // RE-run on new fetching or stop

  // Constant to check if there are tool calls at the end of conv.
  const hasOngoingToolInvocations =
    (getToolInvocations(messages.at(-1)) ?? []).length > 0 &&
    getLastText(messages.at(-1)) == "";

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
    const container = containerRef.current;
    const sentinel = topSentinelRef.current;

    if (!container || !sentinel) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];

        if (
          entry.isIntersecting &&
          hasNextPage &&
          !isFetchingPreviousPage &&
          !isLoading
        ) {
          const scrollFromBottom = container.scrollHeight - container.scrollTop;

          try {
            await fetchPreviousPage();

            requestAnimationFrame(() => {
              container.scrollTop =
                container.scrollHeight - scrollFromBottom - 40;
            });
          } catch (error) {
            console.error("Error fetching previous page:", error);
          }
        }
      },
      {
        root: container,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0.1,
      },
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
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
          loadingStatus={status}
        />
        <div ref={messagesEndRef} className="pb-5" />
      </div>

      <ChatInputInsideThread
        input={input}
        isLoading={isLoading}
        availableTools={availableTools}
        availableModels={availableModels}
        checkedTools={checkedTools}
        currentModel={currentModel}
        threadId={threadId}
        lastMessageId={messages[messages.length - 1]?.id}
        setCheckedTools={setCheckedTools}
        setCurrentModel={setCurrentModel}
        handleInputChange={setInput}
        handleSubmit={handleSubmit}
        hasOngoingToolInvocations={hasOngoingToolInvocations}
        setIsAutoScrollEnabled={setIsAutoScrollEnabled}
        onStop={stop}
        stopped={stopped}
        setStopped={setStopped}
        setMessages={setMessages}
        setIsInvalidating={setIsInvalidating}
      />
    </div>
  );
}
