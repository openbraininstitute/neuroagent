import { Card, CardContent } from "@/components/ui/card";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

type ChatMessageAIProps = {
  content?: string;
  messageId: string;
  validStorageIds?: string[];
};

export const ChatMessageAI = function ChatMessageAI({
  content,
  messageId,
  validStorageIds,
}: ChatMessageAIProps) {
  return (
    <div className="flex items-center justify-start">
      <Card className="ml-6 max-w-[70%] break-all border-none bg-transparent shadow-none">
        <CardContent className="flex items-center py-2">
          <div className="prose max-w-none text-left text-lg dark:prose-invert">
            <MemoizedMarkdown
              content={content || ""}
              id={messageId}
              validStorageIds={validStorageIds}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
