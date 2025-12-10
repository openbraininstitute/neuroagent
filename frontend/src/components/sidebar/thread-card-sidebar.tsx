"use client";
import Link from "next/link";
import { MessageCircle, X, Pencil, Ellipsis } from "lucide-react";
import { Thread } from "@/lib/types";
import { editThread } from "@/actions/edit-thread";
import { deleteThread } from "@/actions/delete-thread";
import { useActionState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { EditThreadDialog } from "@/components/sidebar/edit-thread-dialog";
import { DeleteThreadDialog } from "@/components/sidebar/delete-thread-dialog";
import { Button } from "@/components/ui/button";
import { useState, useOptimistic } from "react";
import { useIsFetching } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadId }: ThreadCardSidebarProps) {
  const [, editAction] = useActionState(editThread, null);
  const [, deleteAction, isDeletePending] = useActionState(deleteThread, null);
  const pathname = usePathname();
  const currentThreadId = pathname.split("/").pop();
  const [isFetchingDeletedThread, setIsFetchingDeletedThread] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [optimisticTitle, addOptimisticTitle] = useOptimistic(
    title,
    (title, newTitle: string) => {
      return newTitle;
    },
  );
  const isFetchingThreads = useIsFetching({ queryKey: ["threads"] });

  useEffect(() => {
    if (isDeletePending) {
      setIsFetchingDeletedThread(true);
    } else if (isFetchingThreads === 0) {
      setIsFetchingDeletedThread(false);
    }
  }, [isDeletePending, isFetchingThreads]);

  return (
    <div
      className={cn(
        "group relative flex w-full items-center py-2 hover:bg-accent/50",
        {
          "bg-accent/50": isDropdownOpen,
          "bg-accent": currentThreadId === threadId,
        },
      )}
      title={title}
    >
      <Link
        href={`/threads/${threadId}`}
        className="flex w-[100%] flex-1 gap-3"
        prefetch={false}
      >
        <MessageCircle />
        <span
          className={`max-w-[80%] truncate ${isFetchingDeletedThread || isDropdownOpen ? "opacity-50" : ""}`}
        >
          {optimisticTitle}
        </span>
      </Link>

      {/* Dropdown Menu */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 translate-x-[10%] transform">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="flex min-w-fit -translate-y-[20%] translate-x-[50%] flex-col border-2">
            {/* Edit Option  */}
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setIsEditDialogOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              <Pencil /> Edit
            </DropdownMenuItem>
            {/* Delete Option */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              <X />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <EditThreadDialog
          title={title}
          threadId={threadId}
          editAction={editAction}
          isDialogOpen={isEditDialogOpen}
          setIsDialogOpen={setIsEditDialogOpen}
          addOptimisticTitle={addOptimisticTitle}
        />
        <DeleteThreadDialog
          threadId={threadId}
          currentThreadId={currentThreadId}
          deleteAction={deleteAction}
          isDialogOpen={isDeleteDialogOpen}
          setIsDialogOpen={setIsDeleteDialogOpen}
        />
      </div>
    </div>
  );
}
