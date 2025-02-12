import { useRef, useState, useEffect } from "react";
import { MessageStrict } from "@/lib/types";
import { Check, Loader2, X, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HumanValidationDialog } from "@/components/human-validation-dialog";
import { ToolInvocation } from "@ai-sdk/ui-utils";
import { useExecuteTool } from "@/hooks/tools";

type ChatMessageToolProps = {
  content?: string;
  threadId: string;
  tool: ToolInvocation;
  validated: "pending" | "accepted" | "rejected" | "not_required";
  setMessage: (updater: (msg: MessageStrict) => MessageStrict) => void;
};

function ScrollToBottom() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return <div ref={messagesEndRef} />;
}

export function ChatMessageTool({
  threadId,
  tool,
  setMessage,
  validated,
}: ChatMessageToolProps) {
  const [toolOpen, setToolOpen] = useState(false);
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

  const renderToolStatus = () => {
    if (tool?.state === "result") {
      if (validated === "rejected") {
        return (
          <div className="flex items-center">
            <X className="h-4 w-4 mr-2 text-red-500" />
            <span className="text-xs text-red-500">Rejected</span>
          </div>
        );
      }
      return (
        <div className="flex items-center">
          <Check className="h-4 w-4 mr-2 text-green-500" />
          <span className="text-xs text-green-500">Executed</span>
        </div>
      );
    }

    if (tool?.state === "call") {
      if (validated === "pending") {
        return (
          <div className="flex items-center">
            <AlertCircle
              className="h-4 w-4 mr-2 text-red-500 cursor-pointer"
              onClick={() => setDialogOpen(true)}
            />
            <span className="text-xs text-red-500">Pending Validation</span>
            {validationError && (
              <span className="text-xs ml-2 text-red-500">
                {` (Previous validation failed: ${validationError})`}
              </span>
            )}
          </div>
        );
      } else if (validated === "accepted") {
        return (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs text-gray-500">Executing</span>
          </div>
        );
      } else if (validated === "rejected") {
        return (
          <div className="flex items-center">
            <X className="h-4 w-4 mr-2 text-red-500" />
            <span className="text-xs text-red-500">Rejected</span>
          </div>
        );
      }
    }

    return (
      <div className="flex items-center">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs text-gray-500">Preparing call</span>
      </div>
    );
  };

  return (
    <div className="border-r-2 p-8 border-white-300 border-solid">
      <HumanValidationDialog
        key={tool.toolCallId}
        threadId={threadId}
        toolId={tool.toolCallId}
        toolName={tool.toolName}
        args={tool.args}
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        setMessage={setMessage}
        mutate={mutate}
      />
      <div className="flex justify-start">
        <Collapsible open={toolOpen} onOpenChange={setToolOpen}>
          <div className="flex items-center gap-4">
            <CollapsibleTrigger className="hover:scale-105 active:scale-[1.10]">
              <span className="text-sm p-4 truncate border-2 bg-blue-500 rounded-xl">
                {tool?.toolName}
              </span>
            </CollapsibleTrigger>
            {tool?.state === "call" && validated === "pending" ? (
              <div className="flex items-center">
                <AlertCircle
                  className="h-4 w-4 mr-2 text-red-500 cursor-pointer"
                  onClick={() => setDialogOpen(true)}
                />
                <span className="text-xs text-red-500">Pending Validation</span>
                {validationError && (
                  <span className="text-xs ml-2 text-red-500">
                    {` (Previous validation failed: ${validationError})`}
                  </span>
                )}
              </div>
            ) : (
              renderToolStatus()
            )}
          </div>
          <CollapsibleContent>
            <ScrollToBottom />
            <Card className="w-[32rem] mt-8 bg-transparent p-8">
              <CardTitle>
                <div className="flex justify-between items-center">
                  <span className="text-lg p-2 text-left truncate">
                    {tool?.toolName}
                  </span>
                  <a
                    href={`/tools/${tool?.toolName}`}
                    className="p-2 hover:text-blue-500 transition-colors"
                  >
                    <Info className="h-5 w-5" />
                  </a>
                </div>
              </CardTitle>
              <CardContent>
                <div className="flex flex-col mt-4">
                  <h1>Args</h1>
                  <pre className="text-sm p-2 my-2 rounded-md overflow-auto bg-gray-100 dark:bg-slate-800">
                    {JSON.stringify(tool?.args, null, 2)}
                  </pre>
                </div>
                {tool?.state === "result" && (
                  <div className="flex flex-col mt-4">
                    <h1>Result</h1>
                    <pre className="text-sm p-2 mt-2 rounded-md overflow-auto bg-gray-100 dark:bg-slate-800">
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
      </div>
    </div>
  );
}
