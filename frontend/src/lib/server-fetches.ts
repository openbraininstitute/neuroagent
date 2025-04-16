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

export async function getThreads(): Promise<BThread[]> {
  try {
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

    if (threadsReponse.ok) {
      const threads = (await threadsReponse.json()) as BThread[];
      // Sort threads by update_date in descending order (most recent first)
      return threads.sort(
        (a, b) =>
          new Date(b.update_date).getTime() - new Date(a.update_date).getTime(),
      );
    } else {
      throw new Error(
        `Error getting thread list. Status code: ${threadsReponse.status} , ${threadsReponse.statusText}`,
      );
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}

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

    const threadResponse = await fetcher({
      path: `/threads/${threadId}`,
      queryParams,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { tags: ["thread", threadId] },
    });

    if (threadResponse.ok) {
      return (await threadResponse.json()) as BThread;
    } else {
      throw new Error(
        `Error getting thread ${threadId}. Status code: ${threadResponse.status} , ${threadResponse.statusText}`,
      );
    }
  } catch (error) {
    console.error(error);
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
    const messagesResponse = await fetcher({
      path: "/threads/{threadId}/messages",
      pathParams: { threadId },
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: {
        tags: [`thread/${threadId}/messages`],
      },
    });
    if (messagesResponse.ok) {
      return await messagesResponse.json();
    } else {
      throw new Error(
        `Error getting messagse for thread: ${threadId}. Status code: ${messagesResponse.status} , ${messagesResponse.statusText}`,
      );
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getTools(): Promise<ToolMetadata[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const toolsResponse = await fetcher({
    method: "GET",
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (toolsResponse.ok) {
    const tools = (await toolsResponse.json()) as BToolMetadata[];
    return tools
      .map((tool) => ({
        name: tool.name,
        nameFrontend: tool.name_frontend,
      }))
      .sort((a, b) => a.nameFrontend.localeCompare(b.nameFrontend));
  } else {
    throw new Error(
      `Error getting all tools. Status code: ${toolsResponse.status} , ${toolsResponse.statusText}`,
    );
  }
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

  if (toolListResponse.ok) {
    const response = await toolListResponse.json();
    return (response as Array<{ name: string; name_frontend: string }>)
      .map((tool) => {
        return { slug: tool.name, label: tool.name_frontend };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  } else {
    throw new Error(
      `Error getting available tool list. Status code: ${toolListResponse.status} , ${toolListResponse.statusText}`,
    );
  }
}

export async function getTool(
  toolName: string,
): Promise<ToolDetailedMetadata | null> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  try {
    const toolResponse = await fetcher({
      method: "GET",
      path: "/tools/{name}",
      pathParams: { name: toolName },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (toolResponse.ok) {
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
    } else {
      throw new Error(
        `Error getting tool ${toolName}. Status code: ${toolResponse.status} , ${toolResponse.statusText}`,
      );
    }
  } catch (error) {
    console.error(error);
    return null;
  }
}
