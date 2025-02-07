"use client";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Dispatch, SetStateAction, RefObject } from "react";

type HilRefusalFeedbackDialogProps = {
  feedback: string;
  isRefusalDialogOpen: boolean;
  setIsRefusalDialogOpen: Dispatch<SetStateAction<boolean>>;
  setFeedback: Dispatch<SetStateAction<string>>;
  setIsAccepted: Dispatch<SetStateAction<"accepted" | "rejected">>;
  formRef: RefObject<HTMLFormElement | null>;
};

export function HilRefusalFeedbackDialog({
  feedback,
  isRefusalDialogOpen,
  setIsRefusalDialogOpen,
  setFeedback,
  setIsAccepted,
  formRef,
}: HilRefusalFeedbackDialogProps) {
  const handlsubmit = () => {
    setIsAccepted("rejected");
    formRef.current?.requestSubmit();
    setIsRefusalDialogOpen(false);
  };

  return (
    <Dialog open={isRefusalDialogOpen} onOpenChange={setIsRefusalDialogOpen}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Rejection Feedback (Optional)</DialogTitle>
          <DialogDescription>
            Tell the agent why you rejected the tool call
          </DialogDescription>
        </DialogHeader>
        <Input
          name="feedback"
          value={feedback}
          type="text"
          autoComplete="off"
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Please could you instead..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlsubmit();
            }
          }}
        />
        <DialogFooter>
          <Button
            type="button"
            name="validation"
            value="rejected"
            onClick={() => {
              setIsRefusalDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handlsubmit}
            name="validation"
            value="rejected"
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
