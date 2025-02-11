"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ToolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Tool Not Found</h2>
        <p className="text-muted-foreground">
          The requested tool could not be found or you may not have permission
          to access it.
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Button onClick={() => router.push("/tools")}>Return to Tools</Button>
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
