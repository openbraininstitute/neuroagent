import { useRef, useState, useEffect } from "react";
import { Message } from "ai/react";
import { Check, Loader2, X, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HumanValidationDialog } from "@/components/human-validation-dialog";
import { Tool } from "@/lib/types";
import { useActionState } from "react";
import { executeTool } from "@/actions/execute-tool";

type ChatMessageToolProps = {
  content?: string;
  threadId: string;
  tool: Tool;
  setMessage: (updater: (msg: Message) => Message) => void;
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
}: ChatMessageToolProps) {
  const [toolOpen, setToolOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, action, isPending] = useActionState(executeTool, null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previousValidationFailed, setPreviousValidationFailed] =
    useState(false);

  useEffect(() => {
    if (isPending) {
      setDialogOpen(false);
      setPreviousValidationFailed(false);
    }
    if (!state) return;

    if (state.success) {
      setValidationError(null);
      setPreviousValidationFailed(false);
      setMessage((msg: Message) => {
        const updatedMsg = {
          ...msg,
          toolInvocations: [
            ...(msg.toolInvocations || []).filter(
              (t: any) => t.toolCallId !== tool.id,
            ),
            {
              toolCallId: tool.id,
              toolName: tool.name,
              args: tool.args,
              result: state.content,
              state: "result" as const,
            },
          ],
        };
        return updatedMsg;
      });
    }

    if (state.error) {
      if (previousValidationFailed) {
        // it takes time for state to update - you cannot re-validate
        return;
      }
      setPreviousValidationFailed(true);
      setValidationError(state.error);
      setMessage((msg: Message) => {
        return {
          ...msg,
          annotations: [
            ...(msg.annotations || []).filter(
              (a: any) => a.toolCallId !== tool.id,
            ),
            { toolCallId: tool.id, validated: "pending" },
          ],
        };
      });
    }
  }, [isPending]);

  const renderToolStatus = () => {
    if (tool?.state === "result") {
      if (tool.hil === "rejected") {
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
      if (tool.hil === "pending") {
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
      } else if (tool.hil === "accepted") {
        return (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs text-gray-500">Executing</span>
          </div>
        );
      } else if (tool.hil === "rejected") {
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
        key={tool.id}
        threadId={threadId}
        toolId={tool.id}
        toolName={tool.name}
        args={tool.args}
        action={action}
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        setMessage={setMessage}
      />
      <div className="flex justify-start">
        <Collapsible open={toolOpen} onOpenChange={setToolOpen}>
          <div className="flex items-center gap-4">
            <CollapsibleTrigger className="hover:scale-105 active:scale-[1.10]">
              <span className="text-sm p-4 truncate border-2 bg-blue-500 rounded-xl">
                {tool?.name}
              </span>
            </CollapsibleTrigger>
            {tool?.state === "call" && tool.hil === "pending" ? (
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
                <span className="text-lg p-2 text-left truncate">
                  {tool?.name}
                </span>
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
                <p className="text-xs p-2 text-left">ID: {tool?.id}</p>
              </CardFooter>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
