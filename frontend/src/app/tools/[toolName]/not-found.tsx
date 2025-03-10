"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound({
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

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">404 Not Found</h2>
        <p className="text-muted-foreground">
          The requested tool could not be found.
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Link href="/tools">
            <Button>Return to Tools</Button>
          </Link>
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
