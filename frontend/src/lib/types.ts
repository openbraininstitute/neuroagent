import { TextUIPart, ToolInvocationUIPart, UIMessage } from "@ai-sdk/ui-utils";

export type BPaginatedResponse = {
  next_cursor: string;
  has_more: boolean;
  page_size: number;
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

export type Annotation = {
  message_id?: string;
  toolCallId?: string;
  validated?: "accepted" | "rejected" | "pending" | "not_required";
  isComplete?: boolean;
  model?: string;
};

export type BTextPart = {
  type: "text";
  text: string;
};

export type BMessageUser = {
  id: string;
  role: "user";
  createdAt: Date;
  content: string;
  parts: [];
  annotation: [];
};

export type BMessageAIContent = {
  id: string;
  role: "assistant";
  createdAt: Date;
  content: string;
  parts: (TextUIPart | ToolInvocationUIPart)[];
  annotations: Annotation[];
};

export type BMessage = BMessageUser | BMessageAIContent;

// This explicitly overrides any existing 'annotations' property
// The AI SDK make it more general by JSONValue[], but we need to be more specific
export type MessageStrict = Omit<UIMessage, "annotations"> & {
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

export type UserHistory = Array<{
  timestamp: number;
  region: string;
  artifact: string | null;
}>;

export type LLMModel = {
  id: string;
  name: string;
  metadata: string;
};

export type BOpenRouterModelResponse = {
  id: string;
  name: string;
  created: number;
  description: string;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
  };
  top_provider: {
    is_moderated: boolean;
  };
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
    input_cache_read: string;
    input_cache_write: string;
    web_search: string;
    internal_reasoning: string;
  };
  context_length: number;
  hugging_face_id: string;
  per_request_limits: Record<string, string>;
  supported_parameters: string[];
};

export const threadPageSize = "25";
export const messagePageSize = "25";
