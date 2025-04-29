import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import Cookies from "js-cookie";
import { BPaginatedResponse, BThread } from "@/lib/types";
import { threadPageSize } from "@/lib/types";

type ThreadsPage = {
  threads: BThread[];
  nextPage?: number;
};

type FetchThreadsPageArgs = {
  page: number;
  fetcher: ReturnType<typeof useFetcher>;
  projectID?: string;
  virtualLabID?: string;
};

async function fetchThreadPage({
  page,
  fetcher,
  projectID,
  virtualLabID,
}: FetchThreadsPageArgs) {
  const queryParams: Record<string, string> = {
    page_size: threadPageSize,
    page: String(page),
  };
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
  const isLastPage =
    paginatedResponseThreads.page >= paginatedResponseThreads.total_pages;

  return {
    threads,
    nextPage: isLastPage ? undefined : page + 1,
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
    queryFn: ({ pageParam = 1 }) =>
      fetchThreadPage({
        page: pageParam as number,
        fetcher,
        projectID,
        virtualLabID,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    initialData: initialData,
  });
}
