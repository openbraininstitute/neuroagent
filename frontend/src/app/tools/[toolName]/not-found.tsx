"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-6">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">404 Not Found</h2>
        <p className="text-muted-foreground">
          The requested tool could not be found.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/tools">
            <Button>Return to Tools</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
