"use client";
import { Button } from "@/components/ui/button";

import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Dispatch, SetStateAction } from "react";

type HilRefusalFeedbackDialogProps = {
  feedback: string;
  setFeedback: Dispatch<SetStateAction<string>>;
  setIsAccepted: Dispatch<SetStateAction<"accepted" | "rejected">>;
  onCancel: () => void;
  onSubmit: () => void;
  isTransitioning: boolean;
};

export function HilRefusalFeedbackDialog({
  feedback,
  setFeedback,
  setIsAccepted,
  onCancel,
  onSubmit,
  isTransitioning,
}: HilRefusalFeedbackDialogProps) {
  const handleSubmit = () => {
    setIsAccepted("rejected");
    onSubmit();
  };

  return (
    <div
      className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
    >
      <DialogHeader>
        <DialogTitle>Rejection Feedback (Optional)</DialogTitle>
        <DialogDescription>
          Tell the agent why you rejected the tool call
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4">
        <Textarea
          name="feedback"
          value={feedback}
          autoComplete="off"
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Please could you instead..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!e.shiftKey) {
                handleSubmit();
              }
            }
          }}
          className="min-h-[100px]"
        />
      </div>
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Send
        </Button>
      </DialogFooter>
    </div>
  );
}
