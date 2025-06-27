import { ReactElement } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";

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
    if (stopped) return <X className="m-1 h-3 w-3" />;
    if (state === "result") {
      if (validated === "rejected") return <X className="m-1 h-3 w-3" />;
      return <Check className="m-1 h-3 w-3" />;
    }
    if (state === "call") {
      if (validated === "pending") return <AlertCircle className="h-5 w-5" />;
      if (validated === "accepted")
        return <Loader2 className="h-5 w-5 animate-spin" />;
      if (validated === "rejected") return <X className="m-1 h-3 w-3" />;
    }
    return <Loader2 className="h-5 w-5 animate-spin" />;
  };

  const getStatusColor = (): string => {
    if (stopped) {
      return "text-red-700 bg-red-200 hover:bg-red-300 dark:text-red-200 dark:bg-red-800/90 dark:hover:bg-red-700/90";
    }
    if (state === "result") {
      if (validated === "rejected")
        return "text-red-700 bg-red-200 hover:bg-red-300 dark:text-red-200 dark:bg-red-800/90 dark:hover:bg-red-700/90";
      return "text-green-800 bg-green-200 hover:bg-green-300 dark:text-green-200 dark:bg-green-800/90 dark:hover:bg-green-700/90";
    }
    if (state === "call") {
      if (validated === "pending")
        return "text-orange-700 bg-orange-200 hover:bg-orange-300 dark:text-orange-200 dark:bg-orange-800/90 dark:hover:bg-orange-700/90";
      if (validated === "accepted")
        return "text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-200 dark:bg-green-800/70 dark:hover:bg-green-700/80";
      if (validated === "rejected")
        return "text-red-700 bg-red-200 hover:bg-red-300 dark:text-red-200 dark:bg-red-800/90 dark:hover:bg-red-700/90";
    }
    return "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-800/90 dark:hover:bg-blue-700/90";
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
    return "Loading";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium ${getStatusColor()} ${expanded && "px-1"}`}
    >
      {getStatusIcon()}
      {expanded && <span className="pr-2">{getStatusText()}</span>}
    </span>
  );
}
