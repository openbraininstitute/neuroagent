"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, Dispatch, SetStateAction } from "react";

type DeleteThreadProps = {
  threadID: string;
  currentThreadId: string | undefined;
  deleteAction: (payload: FormData) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export function DeleteThreadDialog({
  threadID,
  currentThreadId,
  deleteAction,
  isDialogOpen,
  setIsDialogOpen,
}: DeleteThreadProps) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Delete this thread ?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="submit"
            onClick={() => {
              setIsDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <form action={deleteAction}>
            <input type="hidden" name="threadId" value={threadID} readOnly />
            <input
              type="hidden"
              name="currentThreadId"
              value={currentThreadId}
              readOnly
            />
            <Button
              variant="destructive"
              type="submit"
              onClick={(e) => {
                e.stopPropagation();
                setIsDialogOpen(false);
              }}
            >
              Delete
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
