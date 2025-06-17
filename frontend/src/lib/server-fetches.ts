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
  OpenRouterListModelResponse,
} from "@/lib/types";
import { threadPageSize, messagePageSize, LLMModel } from "@/lib/types";

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

    const threads = paginatedResponseThreads.results as BThread[];

    return {
      threads,
      nextCursor: paginatedResponseThreads.has_more
        ? paginatedResponseThreads.next_cursor
        : undefined,
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
      vercel_format: "true",
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

    const messages = (
      paginatedResponseMessages.results as BMessage[]
    ).reverse();

    return {
      messages,
      nextCursor: paginatedResponseMessages.has_more
        ? paginatedResponseMessages.next_cursor
        : undefined,
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

export async function getModels(): Promise<Array<LLMModel>> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    const models = (await response.json()) as OpenRouterListModelResponse;

    return models?.data
      ?.filter(
        (model) =>
          // Include only one of the three providers
          ["google", "openai", "anthropic"].some((keyword) =>
            model.name?.toLowerCase().includes(keyword),
          ) &&
          model.context_length > 70000 &&
          model.architecture?.input_modalities?.includes("text") &&
          model.architecture?.output_modalities?.includes("text") &&
          model.supported_parameters?.includes("tools"),
      )
      .map((model) => {
        const out_date = new Date(model.created * 1000);
        return {
          id: model.id,
          name: model.name,
          metadata: `${Math.round(Number(model.pricing?.prompt) * 1e8) / 100}$/M tokens, ${Math.round(model.context_length / 1000)}k context length, ${out_date.getDate()}/${out_date.getMonth() + 1}/${out_date.getFullYear()}`,
        };
      })
      .sort((a: LLMModel, b: LLMModel) => a.name.localeCompare(b.name));
  } catch (error) {
    if ((error as CustomError).statusCode === 404) {
      return [];
    } else {
      throw error;
    }
  }
}
