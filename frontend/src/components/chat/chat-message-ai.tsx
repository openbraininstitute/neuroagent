import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderPinwheel, Wrench } from "lucide-react";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

type ChatMessageAIProps = {
  content?: string;
  hasTools: boolean;
  messageId: string;
  isLoading: boolean;
  isLastMessage: boolean;
};

export const ChatMessageAI = function ChatMessageAI({
  content,
  hasTools,
  messageId,
  isLoading,
  isLastMessage,
}: ChatMessageAIProps) {
  const lastMessageLoading = isLastMessage && isLoading;

  return (
    <div className="flex items-center justify-start">
      {/* {!lastMessageLoading ? (
        hasTools ? (
          <Button className="ml-8 rounded-full bg-blue-500 p-2.5">
            <Wrench className="text-black dark:text-white" />
          </Button>
        ) : (
          <Button className="ml-8 rounded-full bg-blue-500 p-2.5">
            <LoaderPinwheel className="text-black dark:text-white" />
          </Button>
        )
      ) : (
        <Button className="ml-8 rounded-full bg-blue-500 p-2.5 animate-pulse">
          <LoaderPinwheel className="text-black dark:text-white" />
        </Button>
      )} */}

      <Card className="ml-6 max-w-[70%] break-all border-none bg-transparent shadow-none">
        <CardContent className="flex items-center py-2">
          <div className="prose max-w-none text-left text-lg dark:prose-invert">
            <MemoizedMarkdown content={content || ""} id={messageId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
