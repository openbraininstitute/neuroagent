"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { JsonData } from "json-edit-react";

import { Button } from "@/components/ui/button";
import type { MessageStrict } from "@/lib/types";
import { HilRefusalFeedbackDialog } from "@/components/chat/hil-refusal-feedback-dialog";

type HumanValidationDialogProps = {
  threadId: string;
  toolId: string;
  toolName: string;
  availableTools: Array<{ slug: string; label: string }>;
  args: JsonData;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setMessage: (updater: (msg: MessageStrict) => MessageStrict) => void;
  mutate: (params: {
    threadId: string;
    toolCallId: string;
    validation: "accepted" | "rejected";
    feedback?: string;
  }) => void;
};

export function HumanValidationDialog({
  threadId,
  toolId,
  toolName,
  availableTools,
  args,
  isOpen,
  setIsOpen,
  setMessage,
  mutate,
}: HumanValidationDialogProps) {
  const [isAccepted, setIsAccepted] = useState<"accepted" | "rejected">(
    "rejected",
  );
  const [showReviewDialog, setShowReviewDialog] = useState(true);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [dialogTransition, setDialogTransition] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setShowReviewDialog(true);
        setShowFeedbackDialog(false);
        setFeedback("");
        setDialogTransition(false);
      }, 300);
    }
    setIsOpen(open);
  };

  const handleReject = () => {
    setDialogTransition(true);
    setTimeout(() => {
      setShowReviewDialog(false);
      setShowFeedbackDialog(true);
      setDialogTransition(false);
    }, 300);
  };

  const handleAction = (formData: FormData) => {
    const validation = formData.get("validation") as "accepted" | "rejected";

    setMessage((msg: MessageStrict) => {
      const updatedParts = msg.parts.map((part) => {
        if (
          part.type.startsWith("tool-") &&
          "toolCallId" in part &&
          part.toolCallId === toolId
        ) {
          return {
            ...part,
            input: args,
            state: "input-available" as const,
            output: undefined,
            errorText: undefined,
          } as typeof part;
        }
        return part;
      });

      return {
        ...msg,
        parts: updatedParts as typeof msg.parts,
        metadata: {
          ...msg.metadata,
          toolCalls: [
            ...(msg.metadata?.toolCalls || []).filter(
              (a) => a.toolCallId !== toolId,
            ),
            { toolCallId: toolId, validated: validation, isComplete: true },
          ],
        },
      } as MessageStrict;
    });

    mutate({
      threadId,
      toolCallId: toolId,
      validation,
      feedback: feedback === "" ? undefined : feedback,
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-[50%]">
        <form action={handleAction} ref={formRef}>
          <input type="hidden" name="validation" value={isAccepted} />

          <div className="space-y-4">
            {showReviewDialog && (
              <div
                className={`transition-opacity duration-300 ${dialogTransition ? "opacity-0" : "opacity-100"}`}
              >
                <DialogHeader>
                  <DialogTitle>Human Validation Required</DialogTitle>
                  <DialogDescription>
                    Please review the following tool execution
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <div className="font-semibold">
                    {availableTools.filter(
                      (toolObj) => toolObj.slug === toolName,
                    )?.[0]?.label ?? toolName}
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium">Arguments:</h3>
                    <pre className="mt-2 max-h-[75vh] overflow-y-auto rounded-md bg-muted p-4 text-sm">
                      {JSON.stringify(args, null, 2)}
                    </pre>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReject}
                  >
                    Reject
                  </Button>
                  <Button
                    type="submit"
                    onClick={() => setIsAccepted("accepted")}
                  >
                    Accept
                  </Button>
                </DialogFooter>
              </div>
            )}
            {showFeedbackDialog && (
              <HilRefusalFeedbackDialog
                setIsAccepted={setIsAccepted}
                feedback={feedback}
                setFeedback={setFeedback}
                onCancel={() => {
                  setShowReviewDialog(true);
                  setShowFeedbackDialog(false);
                }}
                onSubmit={() => {
                  setIsAccepted("rejected");
                  formRef.current?.requestSubmit();
                }}
                isTransitioning={dialogTransition}
              />
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
