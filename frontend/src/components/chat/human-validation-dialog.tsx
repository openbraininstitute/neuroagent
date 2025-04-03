"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  JsonData,
  JsonEditor,
  monoDarkTheme,
  monoLightTheme,
} from "json-edit-react";
import { scsPostSchema } from "@/lib/zod-schemas";

import { Button } from "@/components/ui/button";
import type { MessageStrict } from "@/lib/types";
import { HilRefusalFeedbackDialog } from "@/components/chat/hil-refusal-feedback-dialog";

type HumanValidationDialogProps = {
  threadId: string;
  toolId: string;
  toolName: string;
  availableTools: Array<{ slug: string; label: string }>;
  args: Record<string, unknown>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setMessage: (updater: (msg: MessageStrict) => MessageStrict) => void;
  mutate: (params: {
    threadId: string;
    toolCallId: string;
    validation: "accepted" | "rejected";
    args?: string;
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
  const { theme } = useTheme();
  const isLightTheme = theme === "light";

  const [editedArgs, setEditedArgs] = useState<JsonData>(args);
  const [isEdited, setIsEdited] = useState(false);
  const [isAccepted, setIsAccepted] = useState<"accepted" | "rejected">(
    "rejected",
  );
  const [error, setError] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(true);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [dialogTransition, setDialogTransition] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setEditedArgs(args);
  }, [args]);

  const handleArgsChange = (value: JsonData) => {
    console.log(value);
    setEditedArgs(value);
    setIsEdited(JSON.stringify(value) !== JSON.stringify(args));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset the state when the dialog is closed
      setTimeout(() => {
        setEditedArgs(args);
        setIsEdited(false);
        setShowReviewDialog(true);
        setShowFeedbackDialog(false);
        setFeedback("");
        setDialogTransition(false);
        setError("");
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
    setError("");
    // Process the decision first
    try {
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
            ...(msg.toolInvocations || []).filter(
              (t) => t.toolCallId !== toolId,
            ),
            {
              toolCallId: toolId,
              toolName: toolName,
              args: isEdited ? editedArgs : args,
              state: "call" as const,
            },
          ],
        };
        return updatedMsg;
      });
    } catch {
      // Timeout is here to have the flickering effect when clicking
      // "Accept" multiple times on a malformed JSON.
      setTimeout(() => {
        setError("Invalid JSON. Please check your input and try again.");
      }, 50);
      return;
    }

    // Execute using the passed mutate function
    mutate({
      threadId,
      toolCallId: toolId,
      validation,
      args: isEdited ? JSON.stringify(editedArgs) : JSON.stringify(args),
      feedback: feedback === "" ? undefined : feedback,
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-[50%]">
        <form action={handleAction} ref={formRef}>
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="toolCallId" value={toolId} />
          <input type="hidden" name="validation" value={isAccepted} />
          <input
            type="hidden"
            name="args"
            value={isEdited ? JSON.stringify(editedArgs) : JSON.stringify(args)}
          />
          <input type="hidden" name="feedback" value={feedback} />

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
                    {
                      availableTools.filter(
                        (toolObj) => toolObj.slug === toolName,
                      )[0].label
                    }
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium">Arguments:</h3>
                    <JsonEditor
                      data={editedArgs}
                      onUpdate={({ newData }) => {
                        const result = scsPostSchema.safeParse(newData);
                        if (!result.success) {
                          const errorMessage = result.error.errors
                            .map(
                              (error) =>
                                `${error.path.join(".")}${error.path.length ? ": " : ""}${error.message}`,
                            )
                            .join("\n");
                          alert("Json validation error \n" + errorMessage);
                          return "JSON Schema error";
                        }

                        handleArgsChange(result.data);
                      }}
                      setData={(data: JsonData) => handleArgsChange(data)}
                      className="max-h-[75vh] overflow-y-auto"
                      theme={[
                        isLightTheme ? monoLightTheme : monoDarkTheme,
                        {
                          styles: {
                            container: {
                              backgroundColor: isLightTheme
                                ? "#f1f1f1"
                                : "#151515",
                              fontFamily: "Geist Mono",
                            },
                            input: isLightTheme ? "#575757" : "#a8a8a8",
                            inputHighlight: isLightTheme
                              ? "#b3d8ff"
                              : "#1c3a59",
                            string: isLightTheme
                              ? "rgb(8, 129, 215)"
                              : "rgb(38, 139, 210)",
                            number: isLightTheme
                              ? "rgb(8, 129, 215)"
                              : "rgb(38, 139, 210)",
                            boolean: isLightTheme
                              ? "rgb(8, 129, 215)"
                              : "rgb(38, 139, 210)",
                          },
                        },
                      ]}
                      maxWidth={1000}
                      rootName={"JSON"}
                      showStringQuotes={true}
                      showArrayIndices={false}
                      showCollectionCount={false}
                      restrictDelete={true}
                    />
                    {error && (
                      <p
                        className="mt-1 text-sm text-red-500"
                        aria-live="polite"
                      >
                        {error}
                      </p>
                    )}
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
