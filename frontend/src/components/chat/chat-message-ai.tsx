import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderPinwheel, ChevronDown, Wrench } from "lucide-react";

function isSubset<T>(smallSet: Set<T>, largeSet: Set<T>): boolean {
  return [...smallSet].every((element) => largeSet.has(element));
}

type ChatMessageAIProps = {
  content?: string;
  associatedToolsIncides: string[];
  collapsedTools: Set<string>;
  toggleCollapse: (messageId: string[]) => void;
};

export function ChatMessageAI({
  content,
  associatedToolsIncides,
  collapsedTools,
  toggleCollapse,
}: ChatMessageAIProps) {
  return (
    <div className="flex justify-start mt-4">
      {associatedToolsIncides.length > 0 ? (
        <Button
          className="hover:scale-105 active:scale-[1.10] ml-7 mr-1 mt-0.5 bg-blue-500 rounded-full p-2.5"
          onClick={() => toggleCollapse(associatedToolsIncides)}
        >
          {isSubset(new Set(associatedToolsIncides), collapsedTools) ? (
            <Wrench />
          ) : (
            <ChevronDown />
          )}
        </Button>
      ) : (
        <Button className="ml-7 mr-1 mt-0.5 bg-blue-500 rounded-full p-2.5 hover:bg-blue-500">
          <LoaderPinwheel />
        </Button>
      )}

      <Card className="max-w-[70%] bg-transparent shadow-none border-none mt-1">
        <CardContent>
          <span className="prose text-lg pt-8 text-left dark:prose-invert">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
