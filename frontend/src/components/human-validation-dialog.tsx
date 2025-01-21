"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { ExecuteToolResponse } from "@/actions/execute-tool";
import { Message } from "ai";

type HumanValidationDialogProps = {
  threadId: string;
  toolId: string;
  toolName: string;
  args?: Record<string, unknown>;
  className?: string;
  action: (formData: FormData) => Promise<ExecuteToolResponse>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setDecision: (decision: "accepted" | "rejected" | null) => void;
  decision: "accepted" | "rejected" | null;
  setMessage: (updater: (msg: Message) => Message) => void;
};

export function HumanValidationDialog({
  threadId,
  toolId,
  toolName,
  args,
  className,
  action,
  isOpen,
  setIsOpen,
  setMessage,
}: HumanValidationDialogProps) {
  const [editedArgs, setEditedArgs] = useState(JSON.stringify(args, null, 2));
  const [isEdited, setIsEdited] = useState(false);

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

  const handleAction = async (formData: FormData) => {
    const validation = formData.get("validation") as "accepted" | "rejected";

    // Close dialog and set local decision immediately
    setIsOpen(false);
    // Execute the action asynchronously
    action(formData);

    // Process the decision immediately
    setMessage((msg: Message) => {
      const updatedMsg = {
        ...msg,
        annotations: [
          ...(msg.annotations || []).filter(
            (a: any) => a.toolCallId !== toolId,
          ),
          {
            toolCallId: toolId,
            validated: validation,
          },
        ],
        toolInvocations: [
          ...(msg.toolInvocations || []).filter(
            (t: any) => t.toolCallId !== toolId,
          ),
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

    console.log("handleAction end");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <AlertCircle
          className={`h-4 w-4 text-red-500 cursor-pointer ${className}`}
        />
      </DialogTrigger>
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
