"use client";

import { useState } from "react";
import { Eye, Info } from "lucide-react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToolCallStatus } from "@/components/chat/tool-call-status";
import { ToolInvocation } from "@ai-sdk/ui-utils";
import { ScrollToBottom } from "@/components/chat/scroll-to-bottom";
import { viewableTools } from "@/lib/utils";

type ToolCallCollapsibleProps = {
  tool: ToolInvocation;
  toolLabel: string;
  stopped: boolean;
  validated: "pending" | "accepted" | "rejected" | "not_required";
  validationError: string | null;
  onValidationClick: () => void;
};

export function ToolCallCollapsible({
  tool,
  toolLabel,
  stopped,
  validated,
  validationError,
  onValidationClick,
}: ToolCallCollapsibleProps) {
  const [toolOpen, setToolOpen] = useState(false);

  return (
    <Collapsible
      open={toolOpen}
      onOpenChange={
        validated === "pending" && !stopped ? onValidationClick : setToolOpen
      }
    >
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="hover:scale-105 active:scale-[1.10]">
          <span className="truncate rounded-xl border-2 bg-blue-500 p-4 text-sm">
            {toolLabel}
          </span>
        </CollapsibleTrigger>
        <ToolCallStatus
          state={stopped ? "aborted" : tool.state}
          validated={validated}
          validationError={validationError}
          onValidationClick={onValidationClick}
        />
      </div>
      <CollapsibleContent>
        <ScrollToBottom />
        <Card className="mt-8 w-[32rem] bg-transparent p-8">
          <CardTitle>
            <div className="flex items-center justify-between">
              <span className="truncate p-2 text-left text-lg">
                {toolLabel}
              </span>
              <div className="flex gap-2">
                {viewableTools.includes(tool?.toolName) &&
                  tool?.state === "result" &&
                  tool?.result &&
                  (() => {
                    try {
                      const result =
                        typeof tool.result === "string"
                          ? JSON.parse(tool.result)
                          : tool.result;
                      if (result.storage_id) {
                        if (!Array.isArray(result.storage_id)) {
                          return (
                            <a
                              href={`/viewer/${result.storage_id}`}
                              className="p-2 transition-colors hover:text-blue-500"
                            >
                              <Eye className="h-5 w-5" />
                            </a>
                          );
                        } // For now I just remove the eye when there is multiple plots.
                      }
                    } catch {
                      return null;
                    }
                  })()}
                <a
                  href={`/tools/${tool?.toolName}`}
                  className="p-2 transition-colors hover:text-blue-500"
                >
                  <Info className="h-5 w-5" />
                </a>
              </div>
            </div>
          </CardTitle>
          <CardContent>
            <div className="mt-4 flex flex-col">
              <h1>Args</h1>
              <pre className="my-2 max-h-[300px] overflow-auto rounded-md bg-gray-100 p-2 text-sm dark:bg-slate-800">
                {JSON.stringify(tool?.args, null, 2)}
              </pre>
            </div>
            {tool?.state === "result" && (
              <div className="mt-4 flex flex-col">
                <h1>{validated === "rejected" ? "Feedback" : "Result"}</h1>
                <pre className="mt-2 max-h-[300px] overflow-auto rounded-md bg-gray-100 p-2 text-sm dark:bg-slate-800">
                  {typeof tool?.result === "string"
                    ? (() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(tool?.result),
                            null,
                            2,
                          );
                        } catch {
                          return tool?.result;
                        }
                      })()
                    : JSON.stringify(tool?.result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="p-2 text-left text-xs">ID: {tool?.toolCallId}</p>
          </CardFooter>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
