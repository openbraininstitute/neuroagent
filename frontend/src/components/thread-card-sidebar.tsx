"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Thread } from "@/lib/types";
import { editThread } from "@/actions/edit-thread";
import { deleteThread } from "@/actions/delete-thread";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { EditThreadDialog } from "@/components/edit-thread-dialog";
import { DeleteThreadDialog } from "@/components/delete-thread-dialog";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  const [, editAction, isEditPending] = useActionState(editThread, null);
  const [, deleteAction, isDeletePending] = useActionState(deleteThread, null);
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
        <EditThreadDialog
          title={title}
          threadID={threadID}
          editAction={editAction}
          isEditPending={isEditPending}
        />
        <DeleteThreadDialog
          threadID={threadID}
          currentThreadId={currentThreadId}
          deleteAction={deleteAction}
          isDeletePending={isDeletePending}
        />
      </div>
    </div>
  );
}
