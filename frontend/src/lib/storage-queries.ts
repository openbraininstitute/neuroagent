import { useQuery } from "@tanstack/react-query";

export const useStorageId = (src?: string) => {
  return useQuery({
    queryKey: ["storage-id", src],
    queryFn: async () => {
      if (!src || !src.match(/\/storage\/[^/]+$/)) return null;
      const res = await fetch(src, { method: "HEAD" });
      return res.ok ? res.headers.get("X-Storage-Id") : null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!src,
  });
};
