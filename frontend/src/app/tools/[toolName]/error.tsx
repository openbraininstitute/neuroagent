"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ToolError({ reset }: { reset: () => void }) {
  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-6">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Tool Not Found</h2>
        <p className="text-muted-foreground">
          The requested tool could not be found or you may not have permission
          to access it.
        </p>
        <div className="mt-6 flex justify-center gap-4">
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
