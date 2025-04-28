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
  BPaginatedResponse,
} from "@/lib/types";
import { convertToAiMessages } from "@/lib/utils";
import { threadPageSize, messagePageSize } from "@/lib/types";

export async function getThreads() {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return {
        threads: [],
        nextPage: undefined,
      };
    }

    const { projectID, virtualLabID } = await getSettings();

    const queryParams: Record<string, string> = {
      page_size: threadPageSize,
      page: "1",
    };
    if (virtualLabID !== undefined) {
      queryParams.virtual_lab_id = virtualLabID;
    }
    if (projectID !== undefined) {
      queryParams.project_id = projectID;
    }

    const paginatedResponseThreads = (await fetcher({
      path: "/threads",
      queryParams,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { tags: ["threads"] },
    })) as BPaginatedResponse;

    const threads = (paginatedResponseThreads.results as BThread[]).sort(
      (a, b) =>
        new Date(b.update_date).getTime() - new Date(a.update_date).getTime(),
    );
    const isLastPage =
      paginatedResponseThreads.page >= paginatedResponseThreads.total_pages;

    // Sort threads by update_date in descending order (most recent first)
    return {
      threads,
      nextPage: isLastPage ? undefined : 2,
    };
  } catch (error) {
    console.error("Error fetching threads:", error);
    return {
      threads: [],
      nextPage: undefined,
    };
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

export async function getMessages(threadId: string) {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  try {
    const queryParams: Record<string, string> = {
      page_size: messagePageSize,
      page: "1",
    };
    const paginatedResponseMessages = (await fetcher({
      path: "/threads/{threadId}/messages",
      pathParams: { threadId },
      queryParams,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: {
        tags: [`thread/${threadId}/messages`],
      },
    })) as BPaginatedResponse;

    const messages = convertToAiMessages(
      paginatedResponseMessages.results as BMessage[],
    );
    const isLastPage =
      paginatedResponseMessages.page >= paginatedResponseMessages.total_pages;

    return {
      messages,
      nextPage: isLastPage ? undefined : 2,
    };
  } catch (error) {
    if ((error as CustomError).statusCode === 404) {
      return {
        messages: [],
        nextPage: undefined,
      };
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
