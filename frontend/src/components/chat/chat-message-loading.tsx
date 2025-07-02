import { Button } from "@/components/ui/button";
import { LoaderPinwheel } from "lucide-react";

export const ChatMessageLoading = function ChatMessageLoading() {
  return (
    <div className="mt-4 flex justify-start">
      <Button className="ml-12 mt-1 animate-pulse rounded-full bg-blue-500 p-2.5 hover:bg-blue-500">
        <LoaderPinwheel className="text-black dark:text-white" />
      </Button>
    </div>
  );
};
