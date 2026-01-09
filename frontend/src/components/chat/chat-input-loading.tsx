import React from "react";
import { ChatMessageHuman } from "@/components/chat/chat-message-human";
import TextareaAutosize from "react-textarea-autosize";
import { ChatMessageLoading } from "./chat-message-loading";

interface ChatComponentProps {
  newMessage: string;
}

export default function ChatInputLoading({ newMessage }: ChatComponentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto pt-1">
        <ChatMessageHuman key="temp" content={newMessage} />
        <ChatMessageLoading />
      </div>
      <form className="mx-auto flex w-full max-w-[1200px] flex-col justify-center pb-3">
        <div className="overflow-hidden rounded-[2rem] border-2 border-gray-500">
          <div className="flex min-h-16 items-center px-6 pt-2">
            <TextareaAutosize
              readOnly
              className="h-6 w-full resize-none border-none bg-transparent text-base outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-400"
              name="prompt"
              placeholder="Message the AI..."
              autoComplete="off"
              maxRows={10}
            />
          </div>

          <div className="flex items-center justify-between px-6 pb-3 pt-1">
            <div />
            <div className="flex items-center gap-3">
              <button
                disabled
                className="pointer-events-none ml-3 rounded-full p-3 opacity-50"
              >
                <div className="ml-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent p-1" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
