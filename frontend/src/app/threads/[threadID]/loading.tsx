"use client";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import ChatInputLoading from "@/components/chat/chat-input-loading";

export default function Loading() {
  const { newMessage } = useStore();
  return !newMessage ? (
    <div className="w-full h-[50vh] flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  ) : (
    <ChatInputLoading newMessage={newMessage} />
  );
}
