"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, X, Pencil } from "lucide-react";
import { Thread } from "@/lib/types";
import { deleteThread } from "@/actions/delete-thread";
import { editThread } from "@/actions/edit-thread";
import { useActionState } from "react";
import { usePathname } from "next/navigation";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteThread,
    null,
  );
  const [editState, editAction, isEditPending] = useActionState(
    editThread,
    null,
  );
  const pathname = usePathname();
  const currentThreadId = pathname.split("/").pop();

  return (
    <div className="group flex w-full items-center px-2 py-2 hover:bg-accent">
      <Link href={`/threads/${threadID}`} className="flex gap-3 flex-1">
        <MessageCircle />
        <span
          className={`truncate ${isDeletePending || isEditPending ? "opacity-50" : ""}`}
        >
          {title}
        </span>
      </Link>
      <div className="flex gap-1">
        <form action={editAction}>
          <input type="hidden" name="threadId" value={threadID} />
          <input
            type="text"
            name="title"
            className="hidden"
            id={`edit-${threadID}`}
            defaultValue={title}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isEditPending}
            onClick={(e) => {
              e.stopPropagation();
              const input = document.getElementById(
                `edit-${threadID}`,
              ) as HTMLInputElement;
              const newTitle = window.prompt("Enter new title", title);
              if (newTitle) input.value = newTitle;
              else e.preventDefault();
            }}
          >
            <Pencil
              className={`h-4 w-4 ${isEditPending ? "animate-spin" : ""}`}
            />
          </Button>
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="threadId" value={threadID} />
          <input type="hidden" name="currentThreadId" value={currentThreadId} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isDeletePending}
            onClick={(e) => e.stopPropagation()}
          >
            <X className={`h-4 w-4 ${isDeletePending ? "animate-spin" : ""}`} />
          </Button>
        </form>
      </div>
    </div>
  );
}
