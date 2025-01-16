"use client";

import { useRef, useState, useEffect } from "react";
import { Check, Loader2, AlertCircle, X } from "lucide-react";
import Markdown from "react-markdown";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HumanValidationDialog } from "@/components/human-validation-dialog";

type Tool = {
  id: string;
  name: string;
  state: "partial-call" | "call" | "result";
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  hil?: "accepted" | "rejected" | "pending" | "not_required";
};
type ChatMessageProps = {
  id: string;
  type: "human" | "ai" | "tool";
  content?: string;
  tool?: Tool;
};

function ScrollToBottom() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return <div ref={messagesEndRef} />;
}

export function ChatMessage({ id, content, type, tool }: ChatMessageProps) {
  const [toolOpen, setToolOpen] = useState(false);
  console.log("rendering tool");

  const handleAccept = () => {
    // TODO: Implement accept logic
    console.log("Tool accepted:", tool?.id);
  };

  const handleReject = () => {
    // TODO: Implement reject logic
    console.log("Tool rejected:", tool?.id);
  };

  const renderToolStatus = () => {
    // Show green checkmark for completed tools
    if (tool?.state === "result") {
      return <Check className="h-4 w-4 mr-2 text-green-500" />;
    }

    // Special cases
    if (tool?.state === "call") {
      if (tool.hil === "pending") {
        return (
          <HumanValidationDialog
            toolId={tool.id}
            toolName={tool.name}
            args={tool.args}
            className="mr-2"
            onAccept={handleAccept}
            onReject={handleReject}
          />
        );
      }
      if (tool.hil === "rejected") {
        return <X className="h-4 w-4 mr-2 text-red-500" />;
      }
    }

    // Default case: show loader
    return <Loader2 className="h-4 w-4 animate-spin mr-2" />;
  };

  if (type === "tool" && !tool) {
    return null;
  }

  console.log(tool?.hil);

  return (
    <div className="border-r-2 p-8 border-white-300 border-solid">
      {type === "ai" && (
        <div className="flex justify-start">
          <Card className="max-w-2xl bg-transparent shadow-none border-none">
            <CardContent>
              <span className="text-lg pt-8 text-left">
                <Markdown>{content}</Markdown>
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {type === "human" && (
        <div className="flex justify-end">
          <Card>
            <CardContent>
              <h1 className="text-lg pt-8 text-right">{content}</h1>
            </CardContent>
          </Card>
        </div>
      )}

      {type === "tool" && (
        <div className="flex justify-start">
          <Collapsible open={toolOpen} onOpenChange={setToolOpen}>
            <div className="flex items-center gap-4">
              <CollapsibleTrigger className="hover:scale-105 active:scale-[1.10]">
                <span className="text-sm p-4 truncate border-2 bg-blue-500 rounded-xl">
                  {tool?.name}
                </span>
              </CollapsibleTrigger>
              {renderToolStatus()}
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
                        {JSON.stringify(tool?.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <p className="text-xs p-2 text-left truncate">
                    ID: {tool?.id}
                  </p>
                  <div className="text-sm text-gray-500">{id}</div>
                </CardFooter>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
