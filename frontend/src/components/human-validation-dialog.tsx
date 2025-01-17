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
import { executeTool } from "@/actions/execute-tool";
import { useActionState } from "react";

type HumanValidationDialogProps = {
  threadId: string;
  toolId: string;
  toolName: string;
  args?: Record<string, unknown>;
  className?: string;
};

export function HumanValidationDialog({
  threadId,
  toolId,
  toolName,
  args,
  className,
}: HumanValidationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedArgs, setEditedArgs] = useState(JSON.stringify(args, null, 2));
  const [isEdited, setIsEdited] = useState(false);
  const [state, action, isPending] = useActionState(executeTool, null);

  const handleArgsChange = (value: string) => {
    setEditedArgs(value);
    setIsEdited(value !== JSON.stringify(args, null, 2));
  };

  // Handle dialog closure and revalidation after successful action
  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      setEditedArgs(JSON.stringify(args, null, 2));
      setIsEdited(false);
    }
  }, [state?.success, args, threadId]);

  // Add handler for dialog open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditedArgs(JSON.stringify(args, null, 2));
      setIsEdited(false);
    }
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
            {state?.error && (
              <p className="text-sm text-red-500 mt-2">{state.error}</p>
            )}
          </div>
        </div>
        <DialogFooter className="mt-4">
          <form action={action} className="flex gap-2">
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
              value="reject"
              variant="outline"
              disabled={isPending}
            >
              Reject
            </Button>
            <Button
              type="submit"
              name="validation"
              value="accept"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Accept"
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
