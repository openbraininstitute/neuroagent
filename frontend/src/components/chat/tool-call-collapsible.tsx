"use client";

import { useState } from "react";
import { Info, Check, X, Loader2, AlertCircle, OctagonX } from "lucide-react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToolStatusBadge } from "@/components/chat/tool-call-status";
import { ToolInvocation } from "@ai-sdk/ui-utils";

type InlineToolBadgeProps = {
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
}: InlineToolBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="hover:border-current/20 inline-flex items-center gap-1.5 rounded-full border border-transparent bg-blue-100 p-1 pr-3 text-sm font-medium text-blue-700 transition-all hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-500 dark:hover:bg-blue-800"
          onClick={() => {
            if (validated === "pending" && !stopped) {
              onValidationClick();
            }
          }}
        >
          <ToolStatusBadge
            state={tool.state}
            validated={validated}
            stopped={stopped}
          />
          <span className="max-w-[140px] truncate">{toolLabel}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{toolLabel}</h4>
            <div className="flex items-center gap-2">
              <ToolStatusBadge
                state={tool.state}
                validated={validated}
                stopped={stopped}
                expanded={true}
              />
              <a
                href={`/tools/${tool?.toolName}`}
                className="p-1 transition-colors hover:text-blue-500"
              >
                <Info className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h5 className="mb-1 text-xs font-medium text-gray-600">
              Arguments
            </h5>
            <pre className="max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-slate-800">
              {JSON.stringify(tool?.args, null, 2)}
            </pre>
          </div>

          {tool?.state === "result" && (
            <div>
              <h5 className="mb-1 text-xs font-medium text-gray-600">
                {validated === "rejected" ? "Feedback" : "Result"}
              </h5>
              <pre className="max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-slate-800">
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

          <div className="border-t pt-1">
            <p className="text-xs text-gray-500">ID: {tool?.toolCallId}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
