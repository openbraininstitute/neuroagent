import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";

export function useGetPresignedUrl(storageId: string) {
  const fetcher = useFetcher();

  const fetchPresignedUrl = async () => {
    const response = await fetcher({
      method: "GET",
      path: "/storage/{storageId}/presigned-url",
      pathParams: { storageId },
    });
    return response as string;
  };

  return useQuery({
    queryKey: ["presigned-url", storageId],
    queryFn: fetchPresignedUrl,
    staleTime: 500_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
