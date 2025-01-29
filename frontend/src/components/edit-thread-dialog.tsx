"use client";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type EditThreadProps = {
  title: string;
  threadID: string;
  editAction: (payload: FormData) => void;
  isEditPending: boolean;
};

export function EditThreadDialog({
  title,
  threadID,
  editAction,
  isEditPending,
}: EditThreadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  return (
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
  );
}
