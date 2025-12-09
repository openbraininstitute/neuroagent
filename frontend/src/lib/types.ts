import {
  ReasoningUIPart,
  TextUIPart,
  ToolUIPart,
  UIMessage,
  UITools,
  UIDataTypes,
} from "ai";
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

export type MessageMetadata = {
  toolCalls: {
    toolCallId?: string;
    validated?: "accepted" | "rejected" | "pending" | "not_required";
    isComplete?: boolean;
  }[];
};

export type BTextPart = components["schemas"]["TextPartVercel"];

// This type needs to use native vercel AI types which are not defined the backend
export type BMessageUser = {
  id: string;
  role: "user";
  createdAt: Date;
  parts: [];
  metadata: undefined;
  isComplete: boolean;
};

// This type needs to use native vercel AI types which are not defined the backend
export type BMessageAIContent = {
  id: string;
  role: "assistant";
  createdAt: Date;
  parts: (TextUIPart | ToolUIPart | ReasoningUIPart)[];
  metadata: MessageMetadata;
  isComplete: boolean;
};

export type BMessage = BMessageUser | BMessageAIContent;

// Extends the type of UIMessage from Vercel AI.
export type MessageStrict<
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = Omit<UIMessage<unknown, DATA_PARTS, TOOLS>, "metadata"> & {
  metadata?: MessageMetadata;
  isComplete: boolean;
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

export const threadPageSize = "25";
export const messagePageSize = "25";
