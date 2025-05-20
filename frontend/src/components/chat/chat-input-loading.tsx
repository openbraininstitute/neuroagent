import React from "react";
import { ChatMessageHuman } from "@/components/chat/chat-message-human";
import TextareaAutosize from "react-textarea-autosize";

interface ChatComponentProps {
  newMessage: string;
}

export default function ChatInputLoading({ newMessage }: ChatComponentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto pt-1">
        <ChatMessageHuman key="temp" content={newMessage} />
      </div>
      <form className="m-5 flex flex-col items-center justify-center gap-4">
        <div className="flex min-h-16 w-full max-w-[1200px] items-center overflow-hidden rounded-[3vw] border-2 border-gray-500 pl-9 pr-2">
          <TextareaAutosize
            readOnly
            className="h-6 flex-grow resize-none border-none bg-transparent outline-none"
            name="prompt"
            placeholder="Message the AI..."
            autoComplete="off"
            disabled
          />
          <div className="mr-3 flex gap-3">
            <div className="ml-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent p-1" />
          </div>
        </div>
      </form>
    </div>
  );
}
