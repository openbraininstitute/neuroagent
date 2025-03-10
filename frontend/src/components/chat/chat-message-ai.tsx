import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderPinwheel, ChevronDown, Wrench } from "lucide-react";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

type ChatMessageAIProps = {
  content?: string;
  hasTools: boolean;
  toolsCollapsed: boolean;
  toggleCollapse: () => void;
  messageId: string;
};

export const ChatMessageAI = function ChatMessageAI({
  content,
  hasTools,
  toolsCollapsed,
  toggleCollapse,
  messageId,
}: ChatMessageAIProps) {
  return (
    <div className="flex justify-start mt-4">
      {hasTools ? (
        <Button
          className="hover:scale-105 active:scale-[1.10] ml-8 mt-1 bg-blue-500 rounded-full p-2.5"
          onClick={toggleCollapse}
        >
          {toolsCollapsed ? <Wrench /> : <ChevronDown />}
        </Button>
      ) : (
        <Button className="ml-8 mt-1 bg-blue-500 rounded-full p-2.5 hover:bg-blue-500">
          <LoaderPinwheel />
        </Button>
      )}

      <Card className="max-w-[70%] bg-transparent shadow-none border-none mt-1">
        <CardContent>
          <div className="prose text-lg pt-1 text-left dark:prose-invert overflow-y-auto">
            <MemoizedMarkdown content={content || ""} id={messageId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
