"use client";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, Dispatch, SetStateAction } from "react";

type EditThreadProps = {
  title: string;
  threadID: string;
  editAction: (payload: FormData) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export function EditThreadDialog({
  title,
  threadID,
  editAction,
  isDialogOpen,
  setIsDialogOpen,
}: EditThreadProps) {
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
      </form>

      <DialogContent className="[&>button]:hidden">
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
              setIsDialogOpen(false);
            }}
          >
            Cancel
          </Button>
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
