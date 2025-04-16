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
    if (response.ok) {
      const preSignedUrl = (await response.json()) as string;
      return preSignedUrl;
    } else {
      throw new Error(
        `Error getting presigned URL. Status code: ${response.status} , ${response.statusText}`,
      );
    }
  };

  return useQuery({ queryKey: [storageId], queryFn: fetchPresignedUrl });
}
