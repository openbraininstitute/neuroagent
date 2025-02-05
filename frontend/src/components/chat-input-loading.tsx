import React from "react";
import { ChatMessageHuman } from "./chat-message-human";
import { Button } from "./ui/button";

interface ChatComponentProps {
  newMessage: string;
}

export default function ChatInputLoading({ newMessage }: ChatComponentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="relative flex justify-center items-center p-6 w-full">
        <Button className="hover:scale-105 active:scale-[1.10] ml-auto">
          Hide Tools
        </Button>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto my-4">
        <div className="flex flex-col">
          <ChatMessageHuman
            key="temp"
            id="temp"
            threadId="temp"
            content={newMessage}
          />
        </div>
      </div>
      <form className="flex flex-col justify-center items-center gap-4 mb-4">
        <div className="relative w-1/2">
          <input
            type="text"
            readOnly
            className="border-2 border-gray-500 w-full p-4 rounded-full"
            name="prompt"
            value={newMessage}
            placeholder="Message the AI..."
            autoComplete="off"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </form>
    </div>
  );
}
