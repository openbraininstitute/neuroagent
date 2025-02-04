import Markdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";

type ChatMessageAIProps = {
  id: string;
  content?: string;
  threadId: string;
};

export function ChatMessageAI({ content }: ChatMessageAIProps) {
  return (
    <div className="border-r-2 p-4 border-white-300 border-solid ">
      <div className="flex justify-start">
        <Card className="max-w-2xl bg-transparent shadow-none border-none">
          <CardContent>
            <span className="text-lg pt-8 text-left">
              <Markdown>{content}</Markdown>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
