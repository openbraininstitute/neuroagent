"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolStatusBadge } from "@/components/chat/tool-call-status";
import { ToolInvocation } from "@ai-sdk/ui-utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validated === "pending" && !stopped) {
      onValidationClick();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleCopy = (toolResult: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(toolResult);
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 1500);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = toolResult;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      setIsClicked(true);
      document.body.removeChild(textarea);
      setTimeout(() => setIsClicked(false), 1500);
    }
  };

  const getButtonStyling = () => {
    if (validated === "pending") {
      return isOpen
        ? "hover:border-current/20 border-[0.5px] border-orange-300/40 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:border-orange-700/40 dark:bg-orange-900/40 dark:text-orange-200 dark:hover:bg-orange-800"
        : "border-[0.5px] border-orange-300/40 bg-orange-200 text-orange-700 hover:bg-orange-300 dark:border-orange-700/40 dark:bg-orange-800/90 dark:text-orange-200 dark:hover:bg-orange-700/90";
    }

    return isOpen
      ? "hover:border-current/20 border-[0.5px] border-blue-300/40 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:border-blue-700/40 dark:bg-blue-900/40 dark:text-blue-500 dark:hover:bg-blue-800"
      : "border-[0.5px] border-blue-300/40 bg-blue-100 text-blue-700 hover:border-gray-400 dark:border-blue-700/40 dark:bg-blue-900/40 dark:text-blue-500";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-fit">
      <Card
        className={`transition-all duration-200 ${
          isOpen
            ? "max-w-[30vw] border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
            : "w-fit border-none bg-transparent shadow-none"
        }`}
      >
        <CardTitle
          className={`flex items-center gap-2 transition-all duration-200 ${
            isOpen ? "justify-between p-4 pb-2" : "p-0"
          }`}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTriggerClick}
              className={`h-auto gap-1.5 rounded-full p-1 pr-3 text-sm font-medium transition-all ${getButtonStyling()}`}
            >
              <ToolStatusBadge
                state={tool.state}
                validated={validated}
                stopped={stopped}
              />
              <span className="max-w-[240px] truncate">{toolLabel}</span>
              <div className="ml-1">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>

          {isOpen && (
            <div className="flex items-center gap-2">
              <ToolStatusBadge
                state={tool.state}
                validated={validated}
                stopped={stopped}
                expanded={true}
              />
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-auto p-1 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
              >
                <a href={`/tools/${tool?.toolName}`}>
                  <Info className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </CardTitle>

        {isOpen && (
          <CollapsibleContent>
            <CardContent className="space-y-4 px-4 pb-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">
                  Arguments
                </Badge>
                <Card className="border-muted bg-muted/30">
                  <CardContent className="p-3">
                    <pre className="max-h-32 overflow-auto text-xs text-foreground">
                      {JSON.stringify(tool?.args, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {validationError && (
                <div className="space-y-2">
                  <Badge variant="destructive" className="text-xs">
                    Validation Error
                  </Badge>
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-3">
                      <div className="max-h-32 overflow-auto text-xs text-destructive">
                        {validationError}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {tool?.state === "result" && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {validated === "rejected" ? "Feedback" : "Result"}
                    </Badge>
                    {isClicked ? (
                      <Check className="mr-3 h-4 w-4" />
                    ) : (
                      <Copy
                        className="mr-3 h-4 w-4 cursor-pointer opacity-50"
                        onClick={() => handleCopy(tool?.result)}
                      />
                    )}
                  </div>
                  <Card className="border-muted bg-muted/30">
                    <CardContent className="p-3">
                      <pre className="max-h-32 overflow-auto text-xs text-foreground">
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
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}
