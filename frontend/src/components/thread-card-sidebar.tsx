"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

type ThreadCardSidebarProps = {
  title: string;
  threadID: string;
};

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  return (
    <Button asChild variant="ghost" className="w-full justify-start">
      <Link
        href={`/threads/${threadID}`}
        className="flex gap-3 hover:scale-105 w-full"
      >
        <MessageCircle />
        <span>{title}</span>
      </Link>
    </Button>
  );
}
