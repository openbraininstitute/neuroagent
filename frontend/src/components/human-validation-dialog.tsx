"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageStrict } from "@/lib/types";

type HumanValidationDialogProps = {
  threadId: string;
  toolId: string;
  toolName: string;
  args?: Record<string, unknown>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setMessage: (updater: (msg: MessageStrict) => MessageStrict) => void;
  mutate: (params: {
    threadId: string;
    toolCallId: string;
    validation: "accepted" | "rejected";
    args?: string;
  }) => void;
};

export function HumanValidationDialog({
  threadId,
  toolId,
  toolName,
  args,
  isOpen,
  setIsOpen,
  setMessage,
  mutate,
}: HumanValidationDialogProps) {
  const [editedArgs, setEditedArgs] = useState(JSON.stringify(args, null, 2));
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    setEditedArgs(JSON.stringify(args, null, 2));
  }, [args]);

  const handleArgsChange = (value: string) => {
    setEditedArgs(value);
    setIsEdited(value !== JSON.stringify(args, null, 2));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditedArgs(JSON.stringify(args, null, 2));
      setIsEdited(false);
    }
  };

  const handleAction = (formData: FormData) => {
    const validation = formData.get("validation") as "accepted" | "rejected";

    // Process the decision first
    setMessage((msg: MessageStrict) => {
      const updatedMsg = {
        ...msg,
        annotations: [
          ...(msg.annotations || []).filter((a) => a.toolCallId !== toolId),
          {
            toolCallId: toolId,
            validated: validation,
          },
        ],
        toolInvocations: [
          ...(msg.toolInvocations || []).filter((t) => t.toolCallId !== toolId),
          {
            toolCallId: toolId,
            toolName: toolName,
            args: isEdited ? JSON.parse(editedArgs) : args,
            state: "call" as const,
          },
        ],
      };
      return updatedMsg;
    });

    // Execute using the passed mutate function
    mutate({
      threadId,
      toolCallId: toolId,
      validation,
      args: isEdited ? editedArgs : JSON.stringify(args, null, 2),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Human Validation Required</DialogTitle>
          <DialogDescription>
            Please review the following tool execution
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="font-semibold">{toolName}</div>
          <div className="mt-4">
            <h3 className="text-sm font-medium">Arguments:</h3>
            <textarea
              className="mt-2 w-full h-32 font-mono text-sm rounded-md bg-slate-100 p-4 dark:bg-slate-800"
              value={editedArgs}
              onChange={(e) => handleArgsChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <form action={handleAction} className="flex gap-2">
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="toolCallId" value={toolId} />
            <input
              type="hidden"
              name="args"
              value={isEdited ? editedArgs : JSON.stringify(args, null, 2)}
            />
            <Button
              type="submit"
              name="validation"
              value="rejected"
              variant="outline"
              disabled={!isOpen}
            >
              Reject
            </Button>
            <Button
              type="submit"
              name="validation"
              value="accepted"
              disabled={!isOpen}
            >
              Accept
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
