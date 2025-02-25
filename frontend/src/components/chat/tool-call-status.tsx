import { Check, Loader2, X, AlertCircle } from "lucide-react";

type ToolCallStatusProps = {
  state: "call" | "partial-call" | "result";
  validated: "pending" | "accepted" | "rejected" | "not_required";
  validationError?: string | null;
  onValidationClick?: () => void;
};

export function ToolCallStatus({
  state,
  validated,
  validationError,
  onValidationClick,
}: ToolCallStatusProps) {
  if (state === "result") {
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

  if (state === "call") {
    if (validated === "pending") {
      return (
        <div className="flex items-center">
          <AlertCircle
            className="h-4 w-4 mr-2 text-red-500 cursor-pointer"
            onClick={onValidationClick}
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
}
