"use client";
import { useRef, useEffect } from "react";
import { ThreadCardSidebar } from "@/components/sidebar/thread-card-sidebar";
import { BThread } from "@/lib/types";
import { useGetThreadsNextPage } from "@/hooks/get-thread-page";

type ThreadListClientProps = {
  initialThreads: BThread[];
  initialNextCursor?: string;
};

export function ThreadListClient({
  initialThreads,
  initialNextCursor,
}: ThreadListClientProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetThreadsNextPage({
      pages: [
        {
          threads: initialThreads,
          nextCursor: initialNextCursor,
        },
      ],
      pageParams: [1],
    });

  // Flatten threads
  const threads = data?.pages.flatMap((page) => page.threads) ?? [];

  // Identify and store scroll container (second parent)
  useEffect(() => {
    if (!listRef.current) return;
    const container = listRef.current.parentElement?.parentElement;
    if (container) scrollContainerRef.current = container as HTMLElement;
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const onScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
      if (
        scrollTop + clientHeight >= scrollHeight - 50 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener("scroll", onScroll);
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // If container is not scrollable (tall screen), auto-fetch until it is or no more pages
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const isScrollable =
      scrollContainer.scrollHeight > scrollContainer.clientHeight;
    if (!isScrollable && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [threads.length, fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div
      ref={listRef}
      className={`flex flex-col items-center gap-2 ${hasNextPage ? "pb-12" : ""}`}
    >
      {threads.map((t) => (
        <ThreadCardSidebar
          key={t.thread_id}
          title={t.title}
          threadId={t.thread_id}
        />
      ))}

      {isFetchingNextPage && (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
      )}
    </div>
  );
}
