import Markdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pickaxe, LoaderPinwheel } from "lucide-react";

type ChatMessageAIProps = {
  id: string;
  content?: string;
  threadId: string;
  isLoading: boolean;
  associatedToolsIncides: string[];
  toggleCollapse: (messageId: string[]) => void;
};

export function ChatMessageAI({
  content,
  isLoading,
  associatedToolsIncides,
  toggleCollapse,
}: ChatMessageAIProps) {
  return (
    <div className="flex justify-start mt-4">
      {associatedToolsIncides.length > 0 && !isLoading ? (
        <Button
          className="hover:scale-105 active:scale-[1.10] ml-5 bg-blue-500 rounded-full p-3"
          onClick={() => toggleCollapse(associatedToolsIncides)}
        >
          <Pickaxe />
        </Button>
      ) : (
        <Button className="ml-5 bg-blue-500 rounded-full p-3 hover:bg-blue-500">
          <LoaderPinwheel />
        </Button>
      )}

      <Card className="max-w-[70%] bg-transparent shadow-none border-none mt-1">
        <CardContent>
          <span className="text-lg text-left">
            <Markdown>{content}</Markdown>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
