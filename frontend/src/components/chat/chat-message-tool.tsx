"use client";

import { useState, useEffect } from "react";
import { MessageStrict } from "@/lib/types";
import { HumanValidationDialog } from "@/components/chat/human-validation-dialog";
import { ToolInvocation } from "@ai-sdk/ui-utils";
import { useExecuteTool } from "@/hooks/tools";
import { ToolCallCollapsible } from "./tool-call-collapsible";
import React from "react";

type ChatMessageToolProps = {
  content?: string;
  threadId: string;
  tool: ToolInvocation;
  availableTools: Array<{ slug: string; label: string }>;
  validated: "pending" | "accepted" | "rejected" | "not_required";
  setMessage: (updater: (msg: MessageStrict) => MessageStrict) => void;
};

export const ChatMessageTool = function ChatMessageTool({
  threadId,
  tool,
  availableTools,
  setMessage,
  validated,
}: ChatMessageToolProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { mutate, isPending, isSuccess, data, status } = useExecuteTool();

  useEffect(() => {
    if (isPending) {
      setDialogOpen(false);
      return;
    }

    if (isSuccess && data) {
      if (data.status === "done") {
        setValidationError(null);
        setMessage((msg) => {
          const updatedMsg = {
            ...msg,
            toolInvocations: [
              ...(msg.toolInvocations || []).filter(
                (t) => t.toolCallId !== tool.toolCallId,
              ),
              {
                toolCallId: tool.toolCallId,
                toolName: tool.toolName,
                args: tool.args,
                result: data.content,
                state: "result" as const,
              },
            ],
          };
          return updatedMsg;
        });
      } else if (data.status === "validation-error") {
        setValidationError(data.content || "Validation failed");
        setMessage((msg) => {
          return {
            ...msg,
            annotations: [
              ...(msg.annotations || []).filter(
                (a) => a.toolCallId !== tool.toolCallId,
              ),
              { toolCallId: tool.toolCallId, validated: "pending" },
            ],
          };
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toolLabel = availableTools.filter(
    (toolObj) => toolObj.slug === tool.toolName,
  )[0].label;

  return (
    <div className="border-r-2 p-3.5 ml-5 border-white-300 border-solid">
      <HumanValidationDialog
        key={tool.toolCallId}
        threadId={threadId}
        toolId={tool.toolCallId}
        toolName={tool.toolName}
        availableTools={availableTools}
        args={tool.args}
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        setMessage={setMessage}
        mutate={mutate}
      />
      <div className="flex justify-start">
        <ToolCallCollapsible
          tool={tool}
          toolLabel={toolLabel}
          validated={validated}
          validationError={validationError}
          onValidationClick={() => setDialogOpen(true)}
        />
      </div>
    </div>
  );
};
