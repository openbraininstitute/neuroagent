import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import Cookies from "js-cookie";
import { BPaginatedResponse, BThread } from "@/lib/types";
import { threadPageSize } from "@/lib/types";

type ThreadsPage = {
  threads: BThread[];
  nextCursor?: string;
};

type FetchThreadsPageArgs = {
  cursor: string | null;
  fetcher: ReturnType<typeof useFetcher>;
  projectID?: string;
  virtualLabID?: string;
};

async function fetchThreadPage({
  cursor,
  fetcher,
  projectID,
  virtualLabID,
}: FetchThreadsPageArgs) {
  const queryParams: Record<string, string> = {
    page_size: threadPageSize,
  };
  if (cursor !== null) {
    queryParams.cursor = cursor;
  }
  if (virtualLabID !== undefined) {
    queryParams.virtual_lab_id = virtualLabID;
  }
  if (projectID !== undefined) {
    queryParams.project_id = projectID;
  }

  const paginatedResponseThreads = (await fetcher({
    path: "/threads",
    queryParams,
  })) as BPaginatedResponse;
  const threads = paginatedResponseThreads.results as BThread[];

  return {
    threads,
    nextCursor: paginatedResponseThreads.has_more
      ? paginatedResponseThreads.next_cursor
      : undefined,
  };
}

export function useGetThreadsNextPage(
  initialData: InfiniteData<ThreadsPage, unknown>,
) {
  const projectID = Cookies.get("projectID");
  const virtualLabID = Cookies.get("virtualLabID");
  const fetcher = useFetcher();

  return useInfiniteQuery<ThreadsPage, Error>({
    queryKey: ["threads", projectID, virtualLabID],
    queryFn: ({ pageParam = null }) =>
      fetchThreadPage({
        cursor: pageParam as string | null,
        fetcher,
        projectID,
        virtualLabID,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    initialData: initialData,
    refetchOnWindowFocus: false,
  });
}
