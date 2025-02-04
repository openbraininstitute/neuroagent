import { useSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import { useCallback } from "react";
import { fetcher, ResponseBody, FetcherConfig } from "@/lib/fetcher";

export function useFetcher() {
  const { data: session } = useSession() as { data: ExtendedSession | null };

  return useCallback(
    async (config: FetcherConfig): Promise<ResponseBody> => {
      const authHeaders = {
        ...config.headers,
        Authorization: session?.accessToken
          ? `Bearer ${session.accessToken}`
          : "",
      };

      return fetcher({ ...config, headers: authHeaders });
    },
    [session?.accessToken],
  );
}
