import { Message } from "ai/react";

export type BPaginatedResponse = {
  page: number;
  page_size: number;
  total_pages: number;
  results: BThread[] | BMessage[];
};

export type BThread = {
  thread_id: string;
  user_id: string;
  vlab_id: string | null;
  project_id: string | null;
  title: string;
  creation_date: string;
  update_date: string;
};

export type Thread = {
  threadId: string;
  title: string;
};

export type BToolCall = {
  tool_call_id: string;
  name: string;
  arguments: string;
  validated: "accepted" | "rejected" | "pending" | "not_required";
};

export type Annotation = {
  toolCallId?: string;
  validated?: "accepted" | "rejected" | "pending" | "not_required";
  isComplete?: boolean;
};

export type BMessageUser = {
  message_id: string;
  entity: "user";
  thread_id: string;
  creation_date: string;
  is_complete: true;
  msg_content: {
    role: "user";
    content: string;
  };
  tool_calls: never[];
};

export type BMessageAIContent = {
  message_id: string;
  entity: "ai_message";
  thread_id: string;
  order: number;
  creation_date: string;
  is_complete: boolean;
  msg_content: {
    content: string;
    sender: string;
    role: "assistant";
    function_call: null;
  };
  tool_calls: never[];
};

export type BMessageAITool = {
  message_id: string;
  entity: "ai_tool";
  thread_id: string;
  order: number;
  creation_date: string;
  is_complete: boolean;
  msg_content: {
    role: "assistant";
    content: string;
    sender: string;
    function_call: null;
  };
  tool_calls: BToolCall[];
};

export type BMessageTool = {
  message_id: string;
  entity: "tool";
  thread_id: string;
  order: number;
  creation_date: string;
  is_complete: boolean;
  msg_content: {
    role: "assistant";
    tool_call_id: string;
    tool_name: string;
    content: string;
  };
  tool_calls: never[];
};

export type BMessage =
  | BMessageUser
  | BMessageAITool
  | BMessageTool
  | BMessageAIContent;

// This explicitly overrides any existing 'annotations' property
// The AI SDK make it more general by JSONValue[], but we need to be more specific
export type MessageStrict = Omit<Message, "annotations"> & {
  annotations?: Annotation[];
};

export type BExecuteToolCallRequest = {
  validation: "rejected" | "accepted";
  args?: string;
  feedback?: string;
};

export type BExecuteToolCallResponse = {
  status: "done" | "validation-error";
  content: string | null;
};

export type BToolMetadata = {
  name: string;
  name_frontend: string;
};

export type ToolMetadata = {
  name: string;
  nameFrontend: string;
};

export type BToolMetadataDetailed = {
  name: string;
  name_frontend: string;
  description: string;
  description_frontend: string;
  input_schema: string;
  hil: boolean;
  is_online: boolean;
};

export type ToolDetailedMetadata = {
  name: string;
  nameFrontend: string;
  description: string;
  descriptionFrontend: string;
  inputSchema: string;
  hil: boolean;
  isOnline?: boolean; // Optional since it wasn't in the original type
};

export type PlotProp = {
  presignedUrl: string;
  storageId?: string;
  isInChat?: boolean;
};

type BaseObject = {
  title: string;
  description: string;
  x_label?: string;
  y_label?: string;
};

type PiechartValue = {
  category: string;
  value: number;
  color?: string;
};

export type JSONPiechart = BaseObject & {
  values: PiechartValue[];
  show_percentages?: boolean;
};

type BarplotValue = {
  category: string;
  value: number;
  error?: number;
  color?: string;
};

export type JSONBarplot = BaseObject & {
  values: BarplotValue[];
  orientation?: "vertical" | "horizontal";
};

type ScatterplotValue = {
  x: number;
  y: number;
  label?: string;
  color?: string;
  size?: number;
};

export type JSONScatterplot = BaseObject & {
  values: ScatterplotValue[];
  show_regression?: boolean;
};

export type JSONHistogram = BaseObject & {
  values: number[]; // The raw values to bin
  bins: number; // Number of bins to use
  color?: string; // Optional color for the bars
};

type LinechartValue = {
  x: number;
  y: number;
  label?: string;
};

export type JSONLinechart = BaseObject & {
  values: LinechartValue[];
  show_points?: boolean;
  line_style?: string;
  line_color?: string;
};

export type MultiLinechartSeries = {
  data: LinechartValue[];
  series_label?: string | null;
};

export type JSONMultiLinechart = BaseObject & {
  values: MultiLinechartSeries[];
  show_points?: boolean;
  line_style?: "solid" | "dashed" | "dotted" | string | null;
  line_color?: string | null;
};

export type SuggestedQuestions = {
  suggestions: { question: string }[];
};

export class CustomError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const threadPageSize = "25";
export const messagePageSize = "25";
