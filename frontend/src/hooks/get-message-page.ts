import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import { BPaginatedResponse, BMessage } from "@/lib/types";
import { messagePageSize } from "@/lib/types";

type MessagePage = {
  messages: BMessage[];
  nextCursor?: string;
};

type FetchMessagePageArgs = {
  cursor: string | null;
  fetcher: ReturnType<typeof useFetcher>;
  threadId: string;
};

async function fetchMessagePage({
  cursor,
  fetcher,
  threadId,
}: FetchMessagePageArgs) {
  const queryParams: Record<string, string> = {
    page_size: messagePageSize,
  };

  if (cursor !== null) {
    queryParams.cursor = cursor;
  }
  const paginatedResponseMessage = (await fetcher({
    path: "/threads/{threadId}/messages",
    pathParams: { threadId },
    queryParams,
  })) as BPaginatedResponse;

  // Messages arrive as DESC creation_date, we need to reverse the array
  const messages = (paginatedResponseMessage.results as BMessage[]).reverse();

  return {
    messages,
    nextCursor: paginatedResponseMessage.has_more
      ? paginatedResponseMessage.next_cursor
      : undefined,
  };
}

export function useGetMessageNextPage(
  threadId: string,
  initialData: InfiniteData<MessagePage, unknown>,
) {
  const fetcher = useFetcher();

  return useInfiniteQuery<MessagePage, Error>({
    queryKey: ["messages", threadId],
    queryFn: ({ pageParam = null }) =>
      fetchMessagePage({
        cursor: pageParam as string | null,
        fetcher,
        threadId,
      }),
    getPreviousPageParam: (lastPage) => lastPage.nextCursor,
    // we never want to load “newer” pages below, so just return undefined:
    getNextPageParam: () => undefined,
    initialPageParam: initialData.pageParams,
    initialData: initialData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
