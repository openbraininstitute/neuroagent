import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-[50vh] flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
