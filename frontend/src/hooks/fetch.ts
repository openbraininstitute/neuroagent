import { getSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import { useCallback } from "react";
import { fetcher, ResponseBody, FetcherConfig } from "@/lib/fetcher";

export function useFetcher() {
  return useCallback(async (config: FetcherConfig): Promise<ResponseBody> => {
    // Blocks until the session is loaded
    const sess = (await getSession()) as ExtendedSession | null;
    const token = sess?.accessToken ?? "";

    const authHeaders = {
      ...config.headers,
      Authorization: token ? `Bearer ${token}` : "",
    };

    return fetcher({ ...config, headers: authHeaders });
  }, []);
}
