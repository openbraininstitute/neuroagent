"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, X, Pencil, Ellipsis } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type ThreadCardSidebarProps = Thread;

export function ThreadCardSidebar({ title, threadID }: ThreadCardSidebarProps) {
  const [, deleteAction, isDeletePending] = useActionState(deleteThread, null);
  const [, editAction, isEditPending] = useActionState(editThread, null);
  const pathname = usePathname();
  const currentThreadId = pathname.split("/").pop();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  return (
    <div
      className={`group relative flex w-full items-center py-2 hover:bg-accent ${isDropdownOpen ? "bg-accent opacity-50" : ""}  ${currentThreadId === threadID ? "bg-accent opacity-100" : ""}`}
    >
      <Link
        href={`/threads/${threadID}`}
        className="flex gap-3 flex-1 w-[100%]"
      >
        <MessageCircle />
        <span
          className={`truncate max-w-[80%] ${isDeletePending || isEditPending ? "opacity-50 " : ""}`}
        >
          {title}
        </span>
      </Link>

      {/* Dropdown Menu */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 translate-x-[10%]">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="flex flex-col min-w-fit -translate-y-[20%] translate-x-[50%] border-2">
            {/* Edit Option */}
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setIsDialogOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              <Pencil /> Edit
            </DropdownMenuItem>

            {/* Delete Option */}
            <form action={deleteAction}>
              <input type="hidden" name="threadId" value={threadID} readOnly />
              <input
                type="hidden"
                name="currentThreadId"
                value={currentThreadId}
                readOnly
              />
              <DropdownMenuItem asChild>
                <button
                  className="w-[100%]"
                  disabled={isDeletePending}
                  onClick={(e) => e.stopPropagation()}
                >
                  <X />
                  Delete
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <form action={editAction}>
            <input type="hidden" name="threadId" value={threadID} />
            <input
              type="text"
              name="title"
              className="hidden"
              id={`edit-${threadID}`}
              defaultValue={newTitle}
            />
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
                  setIsDialogOpen(false);
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Absolute positioning for the buttons
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 translate-x-[25%]">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                setIsDialogOpen(true);
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
                  setIsDialogOpen(false);
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <form action={deleteAction}>
          <input type="hidden" name="threadId" value={threadID} readOnly />
          <input
            type="hidden"
            name="currentThreadId"
            value={currentThreadId}
            readOnly
          />
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
        </form> */}
      </div>
    </div>
  );
}
