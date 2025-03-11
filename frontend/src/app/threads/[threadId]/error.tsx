"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "@bprogress/next";

export default function ThreadError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Thread error</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <div className="flex gap-4 justify-center mt-6">
          <Button onClick={() => router.push("/")}>Return to main page</Button>
        </div>
      </div>
    </div>
  );
}
