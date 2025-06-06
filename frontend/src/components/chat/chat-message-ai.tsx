import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderPinwheel, ChevronDown, Wrench } from "lucide-react";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

type ChatMessageAIProps = {
  content?: string;
  hasTools: boolean;
  isToolsCollapsed: boolean;
  toggleCollapse: () => void;
  messageId: string;
  isLoading: boolean;
};

export const ChatMessageAI = function ChatMessageAI({
  content,
  hasTools,
  isToolsCollapsed,
  toggleCollapse,
  messageId,
  isLoading,
}: ChatMessageAIProps) {
  return (
    <div className="mt-4 flex justify-start">
      {content && hasTools ? (
        <Button
          className="ml-8 mt-1 rounded-full bg-blue-500 p-2.5 hover:scale-105 active:scale-[1.10]"
          onClick={toggleCollapse}
        >
          {isToolsCollapsed ? (
            <Wrench className="text-black dark:text-white" />
          ) : (
            <ChevronDown className="text-black dark:text-white" />
          )}
        </Button>
      ) : (
        !isLoading && (
          <Button className="ml-8 mt-1 rounded-full bg-blue-500 p-2.5 hover:bg-blue-500">
            <LoaderPinwheel className="text-black dark:text-white" />
          </Button>
        )
      )}

      <Card className="mt-1 max-w-[70%] border-none bg-transparent shadow-none">
        <CardContent>
          <div className="prose max-w-none pt-1 text-left text-lg dark:prose-invert">
            <MemoizedMarkdown content={content || ""} id={messageId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
