import { useQuery } from "@tanstack/react-query";

export function useGetObjectFromStorage(
  presignedUrl: string,
  enabled: boolean,
  getHeadersOnly: boolean = false,
) {
  const fetchPresignedUrl = async () => {
    const response = await fetch(presignedUrl);
    if (getHeadersOnly) {
      return response.headers;
    } else {
      return await response.json();
    }
  };

  return useQuery({
    queryKey: [presignedUrl, getHeadersOnly],
    queryFn: fetchPresignedUrl,
    enabled: enabled,
  });
}
