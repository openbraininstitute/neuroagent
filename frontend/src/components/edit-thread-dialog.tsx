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
  addOptimisticTitle: (action: string) => void;
};

export function EditThreadDialog({
  title,
  threadID,
  editAction,
  isDialogOpen,
  setIsDialogOpen,
  addOptimisticTitle,
}: EditThreadProps) {
  const [newTitle, setNewTitle] = useState(title);

  const handlsubmit = async () => {
    const input = document.getElementById(
      `edit-${threadID}`,
    ) as HTMLInputElement;
    input.value = newTitle;
    input.form?.requestSubmit();
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <form
        action={async (formData) => {
          addOptimisticTitle(formData.get("title") as string);
          editAction(formData);
        }}
      >
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlsubmit();
            }
          }}
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
          <Button type="submit" onClick={handlsubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
