import { Card, CardContent } from "@/components/ui/card";

type ChatMessageHumanProps = {
  id: string;
  content?: string;
  threadId: string;
};

export function ChatMessageHuman({ content }: ChatMessageHumanProps) {
  return (
    <div className="flex justify-end p-8 border-solid">
      <Card className="max-w-[70%]">
        <CardContent>
          <h1 className="text-lg pt-8">{content}</h1>
        </CardContent>
      </Card>
    </div>
  );
}
