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
import { useState, useRef, Dispatch, SetStateAction } from "react";

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
  const formRef = useRef<HTMLFormElement>(null);

  const handlsubmit = async () => {
    formRef.current?.requestSubmit();
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Edit Thread Title</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            addOptimisticTitle(formData.get("title") as string);
            editAction(formData);
          }}
        >
          <input type="hidden" name="threadId" value={threadID} />
          <Input
            name="title"
            value={newTitle}
            type="text"
            autoComplete="off"
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handlsubmit();
              }
            }}
          />
        </form>
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
