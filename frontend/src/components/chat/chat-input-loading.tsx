import React from "react";
import { ChatMessageHuman } from "./chat-message-human";
import TextareaAutosize from "react-textarea-autosize";

interface ChatComponentProps {
  newMessage: string;
}

export default function ChatInputLoading({ newMessage }: ChatComponentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <ChatMessageHuman key="temp" content={newMessage} />
      </div>
      <form className="flex flex-col justify-center items-center gap-4 m-5">
        <div className="flex items-center w-full max-w-[1200px] border-2 border-gray-500 rounded-[3vw] overflow-hidden min-h-16 pl-9 pr-2">
          <TextareaAutosize
            readOnly
            className="flex-grow h-6 outline-none border-none bg-transparent resize-none"
            name="prompt"
            placeholder="Message the AI..."
            autoComplete="off"
            disabled
          />
          <div className="flex gap-3 mr-3">
            <div className="w-6 h-6 border-2 ml-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </form>
    </div>
  );
}
