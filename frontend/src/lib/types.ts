import {
  ReasoningUIPart,
  TextUIPart,
  ToolInvocationUIPart,
  UIMessage,
} from "@ai-sdk/ui-utils";
import { components as ObiOneComponents } from "./obione";
import { components as NeuroagentComponents } from "./neuroagent_types";

export type BPaginatedResponseThread =
  NeuroagentComponents["schemas"]["PaginatedResponse_ThreadsRead_"];

// This type needs to use native vercel AI types which are not defined the backend
export type BPaginatedResponseMessage = Omit<
  NeuroagentComponents["schemas"]["PaginatedResponse_MessagesReadVercel_"],
  "results"
> & { results: BMessage[] };

export type BThread = NeuroagentComponents["schemas"]["ThreadsRead"];

export type Thread = {
  threadId: string;
  title: string;
};

export type Annotation = {
  messageId?: string;
  toolCallId?: string;
  validated?: "accepted" | "rejected" | "pending" | "not_required";
  isComplete?: boolean;
};

export type BTextPart = NeuroagentComponents["schemas"]["TextPartVercel"];

// This type needs to use native vercel AI types which are not defined the backend
export type BMessageUser = {
  id: string;
  role: "user";
  createdAt: Date;
  content: string;
  parts: [];
  annotation: [];
};

// This type needs to use native vercel AI types which are not defined the backend
export type BMessageAIContent = {
  id: string;
  role: "assistant";
  createdAt: Date;
  content: string;
  parts: (TextUIPart | ToolInvocationUIPart | ReasoningUIPart)[];
  annotations: Annotation[];
};

export type BMessage = BMessageUser | BMessageAIContent;

// This explicitly overrides any existing 'annotations' property
// The AI SDK make it more general by JSONValue[], but we need to be more specific
export type MessageStrict = Omit<UIMessage, "annotations"> & {
  annotations?: Annotation[];
};

export type BExecuteToolCallRequest =
  NeuroagentComponents["schemas"]["ExecuteToolCallRequest"];

export type BExecuteToolCallResponse =
  NeuroagentComponents["schemas"]["ExecuteToolCallResponse"];

export type BToolMetadata = NeuroagentComponents["schemas"]["ToolMetadata"];

export type ToolMetadata = {
  name: string;
  nameFrontend: string;
};

export type BToolMetadataDetailed =
  NeuroagentComponents["schemas"]["ToolMetadataDetailed"];

export type ToolDetailedMetadata = {
  name: string;
  nameFrontend: string;
  description: string;
  descriptionFrontend: string;
  utterances: string[];
  inputSchema: string;
  hil: boolean;
  isOnline?: boolean; // Optional since it wasn't in the original type
};

export type PlotProp = {
  presignedUrl: string;
  storageId?: string;
  isInChat?: boolean;
};

export type BQuestionsSuggestions =
  NeuroagentComponents["schemas"]["QuestionsSuggestions"];

export class CustomError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export type UserHistory = Array<NeuroagentComponents["schemas"]["UserJourney"]>;

export type LLMModel = {
  id: string;
  name: string;
  metadata: string;
};

export type BOpenRouterModelResponse =
  NeuroagentComponents["schemas"]["OpenRouterModelResponse"];

export type SimulationsForm = ObiOneComponents["schemas"]["SimulationsForm"];

export const threadPageSize = "25";
export const messagePageSize = "25";
