import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/hooks/fetch";
import { CustomError } from "@/lib/types";

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
    queryKey: [storageId],
    queryFn: fetchPresignedUrl,
    retry: (failureCount, error) => {
      if (error instanceof CustomError && error.statusCode === 404) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 0,
  });
}
