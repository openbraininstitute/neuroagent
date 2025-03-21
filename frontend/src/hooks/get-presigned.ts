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
    console.log(response);
    return response as string;
  };

  return useQuery({ queryKey: [storageId], queryFn: fetchPresignedUrl });
}
