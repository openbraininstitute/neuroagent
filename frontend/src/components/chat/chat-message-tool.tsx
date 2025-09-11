"use client";

import { useState, useEffect } from "react";
import { MessageStrict } from "@/lib/types";
import { HumanValidationDialog } from "@/components/chat/human-validation-dialog";
import { ToolInvocation } from "@ai-sdk/ui-utils";
import { useExecuteTool } from "@/hooks/tools";
import { ToolCallCollapsible } from "@/components/chat/tool-call-collapsible";
import React from "react";
import { JsonSidebar, PatchOperation } from "./collapsible-sidebar-json";
import { Code } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";


type PatchPayload = {
  patches: PatchOperation[];
};

type ChatMessageToolProps = {
  content?: string;
  threadId: string;
  tool: ToolInvocation;
  stopped: boolean;
  availableTools: Array<{ slug: string; label: string }>;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any;
  }) => void;
  validated: "pending" | "accepted" | "rejected" | "not_required";
  setMessage: (updater: (msg: MessageStrict) => MessageStrict) => void;
};

export const ChatMessageTool = function ChatMessageTool({
  threadId,
  tool,
  stopped,
  availableTools,
  addToolResult,
  setMessage,
  validated,
}: ChatMessageToolProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { mutate, isPending, isSuccess, data, status } = useExecuteTool();

  // Set shared JSON state when needed
  useEffect(() => {
  if (tool.toolName === "obione-generatesimulationsconfig" && tool.state === "result") {
    }
  }, [tool.state])

  useEffect(() => {
    // If the request is loading, we wait and close the window
    if (isPending) {
      setDialogOpen(false);
      return;
    }

    if (isSuccess && data) {
      // If the tool has successfully been called, we set the tool result.
      if (data.status === "done") {
        setValidationError(null);
        // We leverage the addToolResult from useChat to add results.
        // It will also trigger the chat automatically when every tool has results !
        addToolResult({ toolCallId: tool.toolCallId, result: data.content });

        // If the tool had a validation error, we have to reset the annotation.
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

  const toolLabel =
    availableTools.filter((toolObj) => toolObj.slug === tool.toolName)?.[0]
      ?.label ?? tool.toolName;

  const getPatches = (tool: ToolInvocation) => {
    try {
      const tool_result = tool.state === "result" ? JSON.parse(tool.result) as PatchPayload : undefined
      const patches = tool_result?.patches
      return patches
      // setSimConfigJson(jsonpatch.applyPatch(simConfigJson, tool_result.patches).newDocument);
      }
      catch {
        const patches = undefined
        toast.error("JSON Edit Error", {
          description: "The tool output is not a valid JSON",
        });
        return patches
      }
    }

  return (
    <div className="border-white-300 ml-5 border-solid p-0.5">
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
      <div className="flex item-center">
      <div className="ml-5 flex justify-start">
        <ToolCallCollapsible
          tool={tool}
          stopped={stopped}
          toolLabel={toolLabel}
          validated={validated}
          validationError={validationError}
          onValidationClick={() => setDialogOpen(true)}
        />
      </div>
    {tool.toolName === "obione-generatesimulationsconfig" &&
    <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="rounded-lg p-1 transition-colors hover:bg-gray-200 ml-2"
          aria-label="Open/Close current JSON"
        >
          <Code className="h-5 w-5 text-blue-600" />
          </button>}  
    </div>
    <JsonSidebar
    isOpen={isSidebarOpen}
    onClose={() => setIsSidebarOpen(false)}
    patches={getPatches(tool)}
    />
    </div>
  );
};
