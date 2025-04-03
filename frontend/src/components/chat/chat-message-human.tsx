import { Card, CardContent } from "@/components/ui/card";

type ChatMessageHumanProps = {
  content?: string;
};

export const ChatMessageHuman = function ChatMessageHuman({
  content,
}: ChatMessageHumanProps) {
  return (
    <div className="flex justify-end break-all border-solid p-8">
      <Card className="max-w-[70%]">
        <CardContent>
          <h1 className="whitespace-pre-wrap pt-8 text-lg">{content}</h1>
        </CardContent>
      </Card>
    </div>
  );
};
