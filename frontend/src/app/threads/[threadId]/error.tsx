"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ThreadError() {
  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Error while fetching thread.</h2>
        <p className="text-muted-foreground">
          {" "}
          You may not have the permission to access this thread.
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Link href="/">
            <Button>Return to main page</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
