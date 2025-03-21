"use client";

import { useState } from "react";
import { Eye, Info } from "lucide-react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToolCallStatus } from "./tool-call-status";
import { ToolInvocation } from "@ai-sdk/ui-utils";
import { ScrollToBottom } from "./scroll-to-bottom";
import { viewableTools } from "@/lib/utils";

type ToolCallCollapsibleProps = {
  tool: ToolInvocation;
  toolLabel: string;
  validated: "pending" | "accepted" | "rejected" | "not_required";
  validationError: string | null;
  onValidationClick: () => void;
};

export function ToolCallCollapsible({
  tool,
  toolLabel,
  validated,
  validationError,
  onValidationClick,
}: ToolCallCollapsibleProps) {
  const [toolOpen, setToolOpen] = useState(false);

  return (
    <Collapsible
      open={toolOpen}
      onOpenChange={validated === "pending" ? onValidationClick : setToolOpen}
    >
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="hover:scale-105 active:scale-[1.10]">
          <span className="text-sm p-4 truncate border-2 bg-blue-500 rounded-xl">
            {toolLabel}
          </span>
        </CollapsibleTrigger>
        <ToolCallStatus
          state={tool.state}
          validated={validated}
          validationError={validationError}
          onValidationClick={onValidationClick}
        />
      </div>
      <CollapsibleContent>
        <ScrollToBottom />
        <Card className="w-[32rem] mt-8 bg-transparent p-8">
          <CardTitle>
            <div className="flex justify-between items-center">
              <span className="text-lg p-2 text-left truncate">
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
                        return (
                          <a
                            href={`/viewer/${result.storage_id}`}
                            className="p-2 hover:text-blue-500 transition-colors"
                          >
                            <Eye className="h-5 w-5" />
                          </a>
                        );
                      }
                    } catch {
                      return null;
                    }
                  })()}
                <a
                  href={`/tools/${tool?.toolName}`}
                  className="p-2 hover:text-blue-500 transition-colors"
                >
                  <Info className="h-5 w-5" />
                </a>
              </div>
            </div>
          </CardTitle>
          <CardContent>
            <div className="flex flex-col mt-4">
              <h1>Args</h1>
              <pre className="text-sm p-2 my-2 rounded-md overflow-auto bg-gray-100 dark:bg-slate-800 max-h-[300px]">
                {JSON.stringify(tool?.args, null, 2)}
              </pre>
            </div>
            {tool?.state === "result" && (
              <div className="flex flex-col mt-4">
                <h1>{validated === "rejected" ? "Feedback" : "Result"}</h1>
                <pre className="text-sm p-2 mt-2 rounded-md overflow-auto bg-gray-100 dark:bg-slate-800 max-h-[300px]">
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
            <p className="text-xs p-2 text-left">ID: {tool?.toolCallId}</p>
          </CardFooter>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
