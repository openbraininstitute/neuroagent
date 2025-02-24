import React from "react";
import { ChatMessageHuman } from "./chat-message-human";

interface ChatComponentProps {
  newMessage: string;
}

export default function ChatInputLoading({ newMessage }: ChatComponentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <ChatMessageHuman key="temp" content={newMessage} />
      </div>
      <form className="flex flex-col justify-center items-center gap-4 mb-4">
        <div className="flex items-center min-w-[70%] max-w-[100%] border-2 border-gray-500 rounded-full overflow-hidden">
          <input
            type="text"
            readOnly
            className="flex-grow outline-none w-full p-4 bg-transparent"
            name="prompt"
            placeholder="Message the AI..."
            autoComplete="off"
            disabled
          />
          <div className="flex gap-2 mr-3">
            <div className="w-6 h-6 border-2 ml-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </form>
    </div>
  );
}
