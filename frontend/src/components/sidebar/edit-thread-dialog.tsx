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
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

type EditThreadProps = {
  title: string;
  threadId: string;
  editAction: (payload: FormData) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
  addOptimisticTitle: (action: string) => void;
};

export function EditThreadDialog({
  title,
  threadId,
  editAction,
  isDialogOpen,
  setIsDialogOpen,
  addOptimisticTitle,
}: EditThreadProps) {
  const [newTitle, setNewTitle] = useState(title);
  const formRef = useRef<HTMLFormElement>(null);

  // This is needed because on mount the title is set to "NewChat" on a new thread.
  useEffect(() => {
    setNewTitle(title);
  }, [title]);

  const handleSubmit = async () => {
    formRef.current?.requestSubmit();
    setIsDialogOpen(false);
  };

  const queryClient = useQueryClient();

  const editWrapper = (formData: FormData) => {
    addOptimisticTitle(formData.get("title") as string);
    editAction(formData);
    queryClient.invalidateQueries({
      queryKey: ["threads"],
    });
  };
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Edit Thread Title</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={editWrapper}>
          <input type="hidden" name="threadId" value={threadId} />
          <Input
            name="title"
            value={newTitle}
            type="text"
            autoComplete="off"
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!e.shiftKey) {
                  handleSubmit();
                }
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
          <Button type="submit" onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
