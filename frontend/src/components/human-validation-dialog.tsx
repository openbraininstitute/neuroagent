"use client";

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
import { AlertCircle } from "lucide-react";
import { useState } from "react";

type HumanValidationDialogProps = {
  toolId: string;
  toolName: string;
  args?: Record<string, unknown>;
  className?: string;
  onAccept: () => void;
  onReject: () => void;
};

export function HumanValidationDialog({
  toolId,
  toolName,
  args,
  className,
  onAccept,
  onReject,
}: HumanValidationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAccept = () => {
    onAccept();
    setIsOpen(false);
  };

  const handleReject = () => {
    onReject();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            <pre className="mt-2 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleReject}>
            Reject
          </Button>
          <Button onClick={handleAccept}>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
