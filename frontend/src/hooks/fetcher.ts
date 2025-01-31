import { useSession } from "next-auth/react";
import { ExtendedSession } from "@/lib/auth";
import useSWR, { SWRConfiguration } from "swr";

export function useAuthenticatedSWR<T>(
  key: string | [string, RequestInit] | null,
  config?: SWRConfiguration,
) {
  const { data: session } = useSession() as { data: ExtendedSession | null };

  const fetcher = async ([url, fetchConfig]: [string, RequestInit?]) => {
    const response = await fetch(url, {
      ...fetchConfig,
      headers: {
        ...fetchConfig?.headers,
        Authorization: session?.accessToken
          ? `Bearer ${session.accessToken}`
          : "",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    return response.json();
  };

  return useSWR<T>(key, fetcher, config);
}

export default useAuthenticatedSWR;
