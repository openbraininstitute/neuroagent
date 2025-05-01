import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import { BPaginatedResponse, BMessage } from "@/lib/types";
import { messagePageSize } from "@/lib/types";

type MessagePage = {
  messages: BMessage[];
  nextPage?: number;
};

type FetchMessagePageArgs = {
  page: number;
  fetcher: ReturnType<typeof useFetcher>;
  threadId: string;
};

async function fetchMessagePage({
  page,
  fetcher,
  threadId,
}: FetchMessagePageArgs) {
  const queryParams: Record<string, string> = {
    page_size: messagePageSize,
    page: String(page),
  };

  const paginatedResponseMessage = (await fetcher({
    path: "/threads/{threadId}/messages",
    pathParams: { threadId },
    queryParams,
  })) as BPaginatedResponse;

  // Messages arrive as DESC creation_date, we need to reverse the array
  const messages = (paginatedResponseMessage.results as BMessage[]).reverse();
  const isLastPage =
    paginatedResponseMessage.page >= paginatedResponseMessage.total_pages;

  return {
    messages,
    nextPage: isLastPage ? undefined : page + 1,
  };
}

export function useGetMessageNextPage(
  threadId: string,
  initialData: InfiniteData<MessagePage, unknown>,
) {
  const fetcher = useFetcher();

  return useInfiniteQuery<MessagePage, Error>({
    queryKey: ["messages", threadId],
    queryFn: ({ pageParam = 1 }) =>
      fetchMessagePage({
        page: pageParam as number,
        fetcher,
        threadId,
      }),
    getPreviousPageParam: (lastPage) => lastPage.nextPage,
    // we never want to load “newer” pages below, so just return undefined:
    getNextPageParam: () => undefined,
    initialPageParam: 1,
    initialData: initialData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
