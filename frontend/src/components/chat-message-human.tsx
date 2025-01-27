import { Card, CardContent } from "@/components/ui/card";

type ChatMessageHumanProps = {
  id: string;
  content?: string;
  threadId: string;
};

export function ChatMessageHuman({ content }: ChatMessageHumanProps) {
  return (
    <div className="border-r-2 p-8 border-white-300 border-solid">
      <div className="flex justify-end">
        <Card>
          <CardContent>
            <h1 className="text-lg pt-8 text-right">{content}</h1>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
