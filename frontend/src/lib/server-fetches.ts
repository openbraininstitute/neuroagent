import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/cookies-server";
import { fetcher } from "@/lib/fetcher";
import {
  BThread,
  BMessage,
  BToolMetadataDetailed,
  BToolMetadata,
  CustomError,
  ToolDetailedMetadata,
  ToolMetadata,
} from "@/lib/types";

export async function getThread(threadId: string): Promise<BThread | null> {
  try {
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

    const thread = (await fetcher({
      path: `/threads/${threadId}`,
      queryParams,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { tags: ["thread", threadId] },
    })) as BThread;
    // Sort threads by update_date in descending order (most recent first)
    return thread;
  } catch (error) {
    console.error(`Error fetching thread ${threadId}:`, error);
    return null;
  }
}

export async function getMessages(
  threadId: string,
): Promise<BMessage[] | null> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  try {
    const response = await fetcher({
      path: "/threads/{threadId}/messages",
      pathParams: { threadId },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: {
        tags: [`thread/${threadId}/messages`],
      },
    });

    return response as Promise<BMessage[]>;
  } catch (error) {
    if ((error as CustomError).statusCode === 404) {
      return [];
    } else {
      throw error;
    }
  }
}

export async function getTools(): Promise<ToolMetadata[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const tools = (await fetcher({
    method: "GET",
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })) as BToolMetadata[];

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

  const response = await fetcher({
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  return (response as Array<{ name: string; name_frontend: string }>)
    .map((tool) => {
      return { slug: tool.name, label: tool.name_frontend };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getTool(
  toolName: string,
): Promise<ToolDetailedMetadata | null> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  try {
    const tool = (await fetcher({
      method: "GET",
      path: "/tools/{name}",
      pathParams: { name: toolName },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })) as BToolMetadataDetailed;

    return {
      name: tool.name,
      nameFrontend: tool.name_frontend,
      description: tool.description,
      descriptionFrontend: tool.description_frontend,
      inputSchema: tool.input_schema,
      hil: tool.hil,
      isOnline: tool.is_online,
    };
  } catch (error) {
    if ((error as CustomError).statusCode === 404) {
      return null;
    } else {
      throw error;
    }
  }
}
