import { Card, CardContent } from "@/components/ui/card";
import { memo } from "react";

type ChatMessageHumanProps = {
  content?: string;
};

export const ChatMessageHuman = memo(function ChatMessageHuman({
  content,
}: ChatMessageHumanProps) {
  console.log("ChatMessageHuman", content);
  return (
    <div className="flex justify-end p-8 border-solid break-all">
      <Card className="max-w-[70%]">
        <CardContent>
          <h1 className="text-lg pt-8">{content}</h1>
        </CardContent>
      </Card>
    </div>
  );
});
