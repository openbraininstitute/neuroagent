import {
  useInfiniteQuery,
  InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import { BPaginatedResponse, BMessage } from "@/lib/types";
import { messagePageSize } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";

export type MessagePage = {
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
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    initialData: initialData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export async function resetInfiniteQueryPagination(
  queryClient: QueryClient,
  threadId: string,
  setIsInvalidating: Dispatch<SetStateAction<boolean>>,
) {
  const queryKey = ["messages", threadId];
  queryClient.setQueryData(
    queryKey,
    (oldData: InfiniteData<MessagePage, unknown>) => {
      if (!oldData) return undefined;
      setIsInvalidating(true);
      return {
        pages: oldData.pages.slice(-1),
        pageParams: oldData.pageParams.slice(-1),
      };
    },
  );
  await queryClient.invalidateQueries({
    queryKey,
  });
  setIsInvalidating(false);
}
