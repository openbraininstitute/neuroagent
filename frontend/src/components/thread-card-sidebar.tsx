"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, X, Pencil } from "lucide-react";
import { Thread } from "@/lib/types";
import { deleteThread } from "@/actions/delete-thread";
import { editThread } from "@/actions/edit-thread";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  const [, deleteAction, isDeletePending] = useActionState(deleteThread, null);
  const [, editAction, isEditPending] = useActionState(editThread, null);
  const pathname = usePathname();
  const currentThreadId = pathname.split("/").pop();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

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
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <form action={editAction}>
            <input type="hidden" name="threadId" value={threadID} />
            <input
              type="text"
              name="title"
              className="hidden"
              id={`edit-${threadID}`}
              defaultValue={newTitle}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isEditPending}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditDialogOpen(true);
              }}
            >
              <Pencil
                className={`h-4 w-4 ${isEditPending ? "animate-spin" : ""}`}
              />
            </Button>
          </form>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Thread Title</DialogTitle>
            </DialogHeader>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
            />
            <DialogFooter>
              <Button
                type="submit"
                onClick={() => {
                  const input = document.getElementById(
                    `edit-${threadID}`,
                  ) as HTMLInputElement;
                  input.value = newTitle;
                  input.form?.requestSubmit();
                  setIsEditDialogOpen(false);
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isDeletePending}
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogOpen(true);
            }}
          >
            <X className={`h-4 w-4 ${isDeletePending ? "animate-spin" : ""}`} />
          </Button>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this thread ?</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="submit"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <form action={deleteAction}>
                <input
                  type="hidden"
                  name="threadId"
                  value={threadID}
                  readOnly
                />
                <input
                  type="hidden"
                  name="currentThreadId"
                  value={currentThreadId}
                  readOnly
                />
                <Button
                  type="submit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(false);
                  }}
                >
                  Delete
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
