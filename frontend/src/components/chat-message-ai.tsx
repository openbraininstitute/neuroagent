import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";

type ChatMessageAIProps = {
  id: string;
  content?: string;
  threadId: string;
};

export function ChatMessageAI({ content }: ChatMessageAIProps) {
  return (
    <div className="border-r-2 p-8 border-white-300 border-solid">
      <div className="flex justify-start">
        <Card className="max-w-[70%] bg-transparent shadow-none border-none">
          <CardContent>
            <span className="prose text-lg pt-8 text-left dark:prose-invert">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
