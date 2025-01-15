export type BThread = {
  thread_id: string;
  user_id: string;
  vlab_id: string;
  project_id: string;
  title: string;
  creation_date: string;
  update_date: string;
};

export type Thread = {
  threadID: string;
  title: string;
};

export type BToolCall = {
  tool_call_id: string;
  name: string;
  arguments: string;
  validated: boolean | null;
};

export type BMessage = {
  message_id: string;
  entity: "user" | "ai_tool" | "tool" | "ai_message";
  thread_id: string;
  order: number;
  creation_date: string;
  msg_content: string;
  tool_calls: BToolCall[];
};
