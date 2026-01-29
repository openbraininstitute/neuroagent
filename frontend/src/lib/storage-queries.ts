import { useQuery } from "@tanstack/react-query";

export const useStorageId = (src?: string, knownStorageIds: string[] = []) => {
  return useQuery({
    queryKey: ["storage-id", src],
    queryFn: async () => {
      if (!src) return null;

      // Check if this src is already in knownStorageIds
      const match = knownStorageIds.find((id) => src.includes(id));
      if (match) return match;

      const res = await fetch(src, { method: "HEAD" });
      return res.ok ? res.headers.get("X-Storage-Id") : null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!src,
  });
};
