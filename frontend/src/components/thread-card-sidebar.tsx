"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { Thread } from "@/lib/types";
import { deleteThread } from "@/actions/delete-thread";
import { useActionState } from "react";
import { usePathname } from "next/navigation";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  const [state, formAction, isPending] = useActionState(deleteThread, null);
  const pathname = usePathname();
  const currentThreadId = pathname.split("/").pop();

  return (
    <div className="group flex w-full items-center px-2 py-2 hover:bg-accent">
      <Link href={`/threads/${threadID}`} className="flex gap-3 flex-1">
        <MessageCircle />
        <span className={isPending ? "opacity-50" : ""}>{title}</span>
      </Link>
      <form action={formAction}>
        <input type="hidden" name="threadId" value={threadID} />
        <input type="hidden" name="currentThreadId" value={currentThreadId} />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={isPending}
          onClick={(e) => e.stopPropagation()}
        >
          <X className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        </Button>
      </form>
    </div>
  );
}
