import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useStorageId = (src?: string) => {
  return useQuery({
    queryKey: ["storage-id", src],
    queryFn: async () => {
      if (!src) return null;
      const res = await fetch(src, { method: "HEAD" });
      return res.ok ? res.headers.get("X-Storage-Id") : null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!src,
  });
};

export const useHasImageLoaded = (storageId: string): boolean => {
  const queryClient = useQueryClient();
  const src = `/app/storage/${storageId}`;
  const queryKey = ["storage-id", src];

  const queryState = queryClient.getQueryState(queryKey);

  return (
    !!queryState &&
    queryState.status === "success" &&
    queryState.data === storageId
  );
};
