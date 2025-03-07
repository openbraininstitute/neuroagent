import { Message } from "ai/react";

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
  toolCallId: string;
  validated: "accepted" | "rejected" | "pending" | "not_required";
};

export type BMessageUser = {
  message_id: string;
  entity: "user";
  thread_id: string;
  order: number;
  creation_date: string;
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

export type BToolMetadataDetailed = {
  name: string;
  name_frontend: string;
  description: string;
  description_frontend: string;
  input_schema: string;
  hil: boolean;
  is_online: boolean;
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
