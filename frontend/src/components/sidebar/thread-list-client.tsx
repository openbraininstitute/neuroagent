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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetThreadsNextPage({
      pages: [
        {
          threads: initialThreads,
          nextCursor: initialNextCursor,
        },
      ],
      pageParams: [null],
    });

  // Flatten threads
  const threads = data?.pages.flatMap((page) => page.threads) ?? [];

  // Mounts sentinel to load additional threads.
  useEffect(() => {
    if (!hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage(); // If the sentinel is visible, load next page
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "50px",
      },
    );
    const sentinel = loadMoreRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div
      ref={scrollContainerRef}
      className={`flex flex-col items-center gap-2 overflow-y-auto pl-3 ${hasNextPage ? "pb-12" : ""}`}
    >
      {threads.map((t) => (
        <ThreadCardSidebar
          key={t.thread_id}
          title={t.title}
          threadId={t.thread_id}
        />
      ))}

      {isFetchingNextPage && (
        <div className="h-6 min-h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
      )}
      {/* When this div enters on screen, it triggers additional fetches*/}
      {hasNextPage && (
        <div ref={loadMoreRef} style={{ height: 1, width: "100%" }} />
      )}
    </div>
  );
}
