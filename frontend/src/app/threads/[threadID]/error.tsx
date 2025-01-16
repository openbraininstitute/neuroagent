"use client";

import { AlertCircle } from "lucide-react";

export default function ThreadError() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center">
      <AlertCircle className="h-10 w-10 text-red-500" />
    </div>
  );
}
