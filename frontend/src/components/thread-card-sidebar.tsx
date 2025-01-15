"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { Thread } from "@/lib/types";
import { deleteThread } from "@/actions/delete-thread";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    const result = await deleteThread(threadID);
  };

  return (
    <Button
      asChild
      variant="ghost"
      className="w-full justify-start group relative"
    >
      <Link
        href={`/threads/${threadID}`}
        className="flex gap-3 hover:scale-105 w-full"
      >
        <MessageCircle />
        <span>{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </Link>
    </Button>
  );
}
