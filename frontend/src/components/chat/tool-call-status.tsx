import { ReactElement } from "react";
import { Info, Check, X, Loader2, AlertCircle, OctagonX } from "lucide-react";

export type ToolState = "call" | "result" | "partial-call";
export type ValidationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "not_required";

interface ToolStatusBadgeProps {
  state: ToolState;
  validated: ValidationStatus;
  stopped: boolean;
  expanded?: boolean;
}

export function ToolStatusBadge({
  state,
  validated,
  stopped,
  expanded,
}: ToolStatusBadgeProps): ReactElement {
  const getStatusIcon = (): ReactElement => {
    if (stopped) return <OctagonX className="h-5 w-5" />;
    if (state === "result") {
      if (validated === "rejected") return <X className="h-3 w-3" />;
      return <Check className="h-3 w-3" />;
    }
    if (state === "call") {
      if (validated === "pending") return <AlertCircle className="h-5 w-5" />;
      if (validated === "accepted")
        return <Loader2 className="h-3 w-3 animate-spin" />;
      if (validated === "rejected") return <X className="h-3 w-3" />;
    }
    return <Loader2 className="h-5 w-5 animate-spin" />;
  };

  const getStatusColor = (): string => {
    if (stopped) {
      return "text-red-700 bg-red-200 hover:bg-red-300 ";
    }
    if (state === "result") {
      if (validated === "rejected")
        return "text-red-700 bg-red-200 hover:bg-red-300 ";
      return "text-green-800 bg-green-200 hover:bg-green-300 ";
    }
    if (state === "call") {
      if (validated === "pending")
        return "text-red-700 bg-red-200 hover:bg-red-300 ";
      if (validated === "accepted")
        return "text-green-700 bg-green-100 hover:bg-green-200 ";
      if (validated === "rejected")
        return "text-red-700 bg-red-200 hover:bg-red-300 ";
    }
    return "text-blue-700 bg-blue-100 hover:bg-blue-200 ";
  };

  const getStatusText = (): string => {
    if (stopped) {
      return "Stopped";
    }
    if (state === "result") {
      if (validated === "rejected") return "Rejected";
      return "Executed";
    }
    if (state === "call") {
      if (validated === "pending") return "Running";
      if (validated === "accepted") return "Validated";
      if (validated === "rejected") return "Rejected";
    }
    return "Undefined state";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${stopped || (state !== "call" && validated !== "pending" && "p-1")} text-xs font-medium ${getStatusColor()} ${expanded && "px-3"}`}
    >
      {getStatusIcon()}
      {expanded && <span>{getStatusText()}</span>}
    </span>
  );
}
