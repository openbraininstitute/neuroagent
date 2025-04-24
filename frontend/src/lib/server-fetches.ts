import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/cookies-server";
import { fetcher } from "@/lib/fetcher";
import {
  BThread,
  BMessage,
  BToolMetadataDetailed,
  BToolMetadata,
  ToolDetailedMetadata,
  ToolMetadata,
} from "@/lib/types";

export async function getThreads(): Promise<
  BThread[] | Record<string, string | boolean>
> {
  const session = await auth();
  if (!session?.accessToken) {
    return [];
  }

  const { projectID, virtualLabID } = await getSettings();

  const queryParams: Record<string, string> = {};
  if (virtualLabID !== undefined) {
    queryParams.virtual_lab_id = virtualLabID;
  }
  if (projectID !== undefined) {
    queryParams.project_id = projectID;
  }

  const threadsReponse = await fetcher({
    path: "/threads",
    queryParams,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { tags: ["threads"] },
  });

  if (!threadsReponse.ok) {
    return {
      succes: false,
      error: `Error getting threads. Status code: ${threadsReponse.status} , ${threadsReponse.statusText}`,
    };
  }

  const threads = (await threadsReponse.json()) as BThread[];
  // Sort threads by update_date in descending order (most recent first)
  return threads.sort(
    (a, b) =>
      new Date(b.update_date).getTime() - new Date(a.update_date).getTime(),
  );
}

export async function getThread(
  threadId: string,
): Promise<BThread | Record<string, string | boolean> | null> {
  const session = await auth();
  if (!session?.accessToken) {
    return null;
  }

  const { projectID, virtualLabID } = await getSettings();

  const queryParams: Record<string, string> = {};
  if (virtualLabID !== undefined) {
    queryParams.virtual_lab_id = virtualLabID;
  }
  if (projectID !== undefined) {
    queryParams.project_id = projectID;
  }

  const threadResponse = await fetcher({
    path: `/threads/${threadId}`,
    queryParams,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { tags: ["thread", threadId] },
  });

  if (!threadResponse.ok) {
    return {
      succes: false,
      error: `Error getting thread ${threadId}. Status code: ${threadResponse.status} , ${threadResponse.statusText}`,
    };
  }

  return (await threadResponse.json()) as BThread;
}

export async function getMessages(
  threadId: string,
): Promise<BMessage[] | Record<string, string | boolean> | null> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const messagesResponse = await fetcher({
    path: "/threads/{threadId}/messages",
    pathParams: { threadId },
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: {
      tags: [`thread/${threadId}/messages`],
    },
  });

  if (!messagesResponse.ok) {
    return {
      succes: false,
      error: `Error getting messagse for thread: ${threadId}. Status code: ${messagesResponse.status} , ${messagesResponse.statusText}`,
    };
  }

  return await messagesResponse.json();
}

export async function getTools(): Promise<
  ToolMetadata[] | Record<string, string | boolean>
> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const toolsResponse = await fetcher({
    method: "GET",
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!toolsResponse.ok) {
    return {
      succes: false,
      error: `Error getting all tools. Status code: ${toolsResponse.status} , ${toolsResponse.statusText}`,
    };
  }

  const tools = (await toolsResponse.json()) as BToolMetadata[];
  return tools
    .map((tool) => ({
      name: tool.name,
      nameFrontend: tool.name_frontend,
    }))
    .sort((a, b) => a.nameFrontend.localeCompare(b.nameFrontend));
}

export async function getToolList() {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const toolListResponse = await fetcher({
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!toolListResponse.ok) {
    return {
      succes: false,
      error: `Error getting available tool list. Status code: ${toolListResponse.status} , ${toolListResponse.statusText}`,
    };
  }

  const response = await toolListResponse.json();
  return (response as Array<{ name: string; name_frontend: string }>)
    .map((tool) => {
      return { slug: tool.name, label: tool.name_frontend };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getTool(
  toolName: string,
): Promise<ToolDetailedMetadata | Record<string, string | boolean> | null> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const toolResponse = await fetcher({
    method: "GET",
    path: "/tools/{name}",
    pathParams: { name: toolName },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!toolResponse.ok) {
    return {
      succes: false,
      error: `Error getting tool ${toolName}. Status code: ${toolResponse.status} , ${toolResponse.statusText}`,
    };
  }

  const tool = (await await toolResponse.json()) as BToolMetadataDetailed;
  return {
    name: tool.name,
    nameFrontend: tool.name_frontend,
    description: tool.description,
    descriptionFrontend: tool.description_frontend,
    inputSchema: tool.input_schema,
    hil: tool.hil,
    isOnline: tool.is_online,
  };
}
