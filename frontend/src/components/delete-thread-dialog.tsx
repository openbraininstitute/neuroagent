"use client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

type DeleteThreadProps = {
  threadID: string;
  currentThreadId: string | undefined;
  deleteAction: (payload: FormData) => void;
  isDeletePending: boolean;
};

export function DeleteThreadDialog({
  threadID,
  currentThreadId,
  deleteAction,
  isDeletePending,
}: DeleteThreadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        disabled={isDeletePending}
        onClick={(e) => {
          e.stopPropagation();
          setIsDialogOpen(true);
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
