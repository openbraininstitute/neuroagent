import {
  ReasoningUIPart,
  TextUIPart,
  ToolInvocationUIPart,
  UIMessage,
} from "@ai-sdk/ui-utils";
import { components } from "./neuroagent_types";

export type BPaginatedResponseThread =
  components["schemas"]["PaginatedResponse_ThreadsRead_"];

// This type needs to use native vercel AI types which are not defined the backend
export type BPaginatedResponseMessage = Omit<
  components["schemas"]["PaginatedResponse_MessagesReadVercel_"],
  "results"
> & { results: BMessage[] };

export type BThread = components["schemas"]["ThreadsRead"];

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

export type BTextPart = components["schemas"]["TextPartVercel"];

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
  components["schemas"]["ExecuteToolCallRequest"];

export type BExecuteToolCallResponse =
  components["schemas"]["ExecuteToolCallResponse"];

export type BToolMetadata = components["schemas"]["ToolMetadata"];

export type ToolMetadata = {
  name: string;
  nameFrontend: string;
};

export type BToolMetadataDetailed =
  components["schemas"]["ToolMetadataDetailed"];

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
  components["schemas"]["QuestionsSuggestions"];

export class CustomError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export type UserHistory = Array<components["schemas"]["UserJourney"]>;

export type LLMModel = {
  id: string;
  name: string;
  metadata: string;
};

export type BOpenRouterModelResponse =
  components["schemas"]["OpenRouterModelResponse"];

export type BStateRead = components["schemas"]["StateRead"];
export type SharedState = components["schemas"]["SharedState"];

export const threadPageSize = "25";
export const messagePageSize = "25";
