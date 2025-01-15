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
