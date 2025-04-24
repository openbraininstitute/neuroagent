"use client";
import { useRef, useEffect } from "react";
import { ThreadCardSidebar } from "@/components/sidebar/thread-card-sidebar";
import { BThread } from "@/lib/types";
import { useGetThreadsNextPage } from "@/hooks/get-threads";

type ThreadListClientProps = {
  initialThreads: BThread[];
  initialIsLastPage?: boolean;
};

export function ThreadListClient({
  initialThreads,
  initialIsLastPage,
}: ThreadListClientProps) {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetThreadsNextPage({
    pages: [
      {
        threads: initialThreads,
        nextPage: initialIsLastPage ? undefined : 2,
      },
    ],
    pageParams: [1],
  });

  useEffect(() => {
    const onScroll = () => {
      if (isLoading || !hasNextPage) return;
      if (
        window.innerHeight + window.scrollY + 200 >=
        document.body.offsetHeight
      ) {
        fetchNextPage();
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const threads = data?.pages.flatMap((page) => page.threads) ?? [];
  return (
    <div className="flex flex-col gap-2 px-3">
      {threads.map((t) => (
        <ThreadCardSidebar
          key={t.thread_id}
          title={t.title}
          threadId={t.thread_id}
        />
      ))}
      {loadingRef.current && <p className="text-center">Loading…</p>}
      {isLastPage && (
        <p className="text-center text-sm">You’ve reached the end!</p>
      )}
    </div>
  );
}
