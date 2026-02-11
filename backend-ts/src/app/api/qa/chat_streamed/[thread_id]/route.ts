/**
 * Chat Streaming API Route
 *
 * Handles streaming chat responses for a specific thread.
 *
 * Features:
 * - JWT authentication via Keycloak
 * - Rate limiting per user
 * - Thread ownership validation
 * - Message history loading
 * - Streaming responses using Vercel AI SDK
 * - Token consumption tracking
 * - Query size validation
 *
 * Requirements: 1.4, 2.1, 2.2, 2.4, 6.5, 14.1, 14.3
 */

import { type NextRequest } from 'next/server';
import ky from 'ky';
import { z } from 'zod';

import { AgentsRoutine } from '@/lib/agents/routine';
import { getSettings } from '@/lib/config/settings';
import { prisma } from '@/lib/db/client';
import { getS3Client } from '@/lib/storage/client';
import {
  validateAuth,
  validateProject,
  AuthenticationError,
  AuthorizationError,
} from '@/lib/middleware/auth';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { initializeTools } from '@/lib/tools';
import { Entity } from '@/types';

/**
 * Shared state schema (matches Python SharedState)
 */
const SharedStateSchema = z.object({
  smc_simulation_config: z.record(z.any()).nullable().optional(),
});

/**
 * Request body schema for chat streaming (matches Python ClientRequest)
 */
const ChatStreamRequestSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
  model: z.string().optional(),
  tool_selection: z.array(z.string()).optional(),
  frontend_url: z.string().optional(),
  shared_state: SharedStateSchema.nullable().optional(),
});

/**
 * Error response helper
 */
function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({
      error: message,
      statusCode: status,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Maximum duration for streaming (5 minutes)
 * This is a Next.js route config option
 */
export const maxDuration = 300;

/**
 * POST /api/qa/chat_streamed/[thread_id]
 *
 * Stream a chat response for the given thread.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing thread_id
 * @returns Streaming response with chat completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> }
) {
  const settings = getSettings();

  try {
    // Await params (Next.js 15+ requirement)
    const { thread_id } = await params;

    // Validate thread_id is a valid UUID
    if (!thread_id || thread_id === 'undefined' || thread_id === 'null') {
      return errorResponse('Invalid thread ID: Thread ID is required and must be a valid UUID', 400);
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(thread_id)) {
      return errorResponse('Invalid thread ID: Thread ID must be a valid UUID format', 400);
    }

    // ========================================================================
    // 1. Authentication
    // ========================================================================
    const userInfo = await validateAuth(request);

    // ========================================================================
    // 2. Rate Limiting
    // ========================================================================
    const rateLimitResult = await checkRateLimit(
      userInfo.sub,
      'chat',
      settings.rateLimiter.limitChat,
      settings.rateLimiter.expiryChat
    );

    if (rateLimitResult.limited) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          ...rateLimitResult.headers,
          'Content-Type': 'text/plain',
        },
      });
    }

    // ========================================================================
    // 3. Load Thread and Validate Ownership
    // ========================================================================
    const thread = await prisma.thread.findUnique({
      where: { id: thread_id },
    });

    if (!thread) {
      return errorResponse('Thread not found', 404);
    }

    // Validate thread ownership
    if (thread.userId !== userInfo.sub) {
      return errorResponse('Access denied: You do not own this thread', 403);
    }

    // Validate project access if thread has vlab/project
    if (thread.vlabId && thread.projectId) {
      try {
        validateProject(userInfo.groups, thread.vlabId, thread.projectId);
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return errorResponse(error.message, 403);
        }
        throw error;
      }
    }

    // ========================================================================
    // 4. Parse and Validate Request Body
    // ========================================================================
    let body: z.infer<typeof ChatStreamRequestSchema>;
    try {
      const rawBody = await request.json();
      body = ChatStreamRequestSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse(
          `Invalid request: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      return errorResponse('Invalid request body', 400);
    }

    // Validate query size
    if (body.content.length > settings.misc.queryMaxSize) {
      return errorResponse(
        `Query too large: maximum ${settings.misc.queryMaxSize} characters`,
        413
      );
    }

    // ========================================================================
    // 5. Save User Message to Database
    // ========================================================================
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        creationDate: new Date(),
        threadId: thread_id,
        entity: Entity.USER,
        content: JSON.stringify({
          role: 'user',
          content: body.content,
        }),
        isComplete: true,
      },
    });

    // Update thread's updateDate
    await prisma.thread.update({
      where: { id: thread_id },
      data: { updateDate: new Date() },
    });

    // ========================================================================
    // 6. Initialize Tools
    // ========================================================================

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    const jwtToken = authHeader?.replace('Bearer ', '');

    // Get tool CLASSES (not instances) - following ClassVar pattern
    const allToolClasses = await initializeTools({
      exaApiKey: settings.tools.exaApiKey,
      sanityUrl: settings.tools.sanity.url,
      entitycoreUrl: settings.tools.entitycore.url,
      entityFrontendUrl: settings.tools.frontendBaseUrl,
      vlabId: thread.vlabId || undefined,
      projectId: thread.projectId || undefined,
      jwtToken, // Pass JWT token to tools
      obiOneUrl: settings.tools.obiOne.url,
      mcpConfig: settings.mcp,
    });

    // ========================================================================
    // 6.5. Apply Tool Selection Filter (if provided)
    // ========================================================================
    let selectedToolClasses = allToolClasses;
    if (body.tool_selection && body.tool_selection.length > 0) {

      // Create a map of tool names to tool classes for efficient lookup
      // Tool classes have a static 'toolName' property
      const toolMap = new Map(
        allToolClasses.map(ToolClass => [ToolClass.toolName, ToolClass])
      );

      // Filter to only include selected tools
      selectedToolClasses = body.tool_selection
        .map(toolName => toolMap.get(toolName))
        .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);


      // Log which tools were selected and which were not found
      if (selectedToolClasses.length !== body.tool_selection.length) {
        const foundTools = selectedToolClasses.map(t => t.toolName);
        const notFoundTools = body.tool_selection.filter(name => !foundTools.includes(name));
        console.warn('[chat_streamed] Tools not found:', notFoundTools);
      }
    }

    // ========================================================================
    // 7. Filter Tools and Select Model
    // ========================================================================

    // Import the filtering function
    const { filterToolsAndModelByConversation } = await import('@/lib/utils/tool-filtering');

    // Determine if we need to filter tools and select model
    const selectedModel = body.model === 'auto' ? null : body.model || null;

    // Filter tools and select model if OpenRouter token is available
    let filteredTools: any[];
    let selectedModelId: string;
    let reasoning: string | null = null;

    if (settings.llm.openRouterToken) {
      console.log('[chat_streamed] Filtering tools and selecting model...');
      const filteringResult = await filterToolsAndModelByConversation(
        thread_id,
        selectedToolClasses, // Use the tool_selection as the pool to filter from
        settings.llm.openRouterToken,
        settings.tools.minToolSelection,
        selectedModel,
        settings.llm.defaultChatModel,
        settings.llm.defaultChatReasoning
      );

      filteredTools = filteringResult.filteredTools;
      selectedModelId = filteringResult.model;
      reasoning = filteringResult.reasoning ?? null;
      console.log('[chat_streamed] Tool filtering complete:', {
        availableToolsCount: selectedToolClasses.length,
        filteredToolCount: filteredTools.length,
        selectedModel: selectedModelId,
        reasoning,
      });
    } else {
      console.log('[chat_streamed] No OpenRouter token, skipping filtering');
      // No OpenRouter token, use all available tools and default model
      filteredTools = selectedToolClasses;
      selectedModelId = selectedModel ?? settings.llm.defaultChatModel;
    }

    // ========================================================================
    // 8. Create Agent Configuration
    // ========================================================================

    // Map reasoning string to valid enum value (lowercase for Vercel AI SDK)
    let reasoningLevel: 'none' | 'minimal' | 'low' | 'medium' | 'high' | undefined;
    if (reasoning) {
      const reasoningLower = reasoning.toLowerCase();
      if (['none', 'minimal', 'low', 'medium', 'high'].includes(reasoningLower)) {
        reasoningLevel = reasoningLower as 'none' | 'minimal' | 'low' | 'medium' | 'high';
      }
    }

    // Create authenticated HTTP client with JWT token
    // This matches Python's httpx_client pattern from dependencies.py
    const httpClient = ky.create({
      timeout: 300000, // 5 minutes (matches Python)
      retry: 0,
      hooks: {
        beforeRequest: [
          (request) => {
            if (jwtToken) {
              request.headers.set('Authorization', `Bearer ${jwtToken}`);
            }
            // Add request ID for correlation if available
            const requestId = headers.get('x-request-id');
            if (requestId) {
              request.headers.set('x-request-id', requestId);
            }
          },
        ],
      },
    });

    const agentConfig = {
      model: selectedModelId,
      temperature: settings.llm.temperature,
      maxTokens: settings.llm.maxTokens,
      reasoning: reasoningLevel,
      tools: filteredTools,
      contextVariables: {
        httpClient, // Pass ky instance with JWT token
        exaApiKey: settings.tools.exaApiKey,
        sanityUrl: settings.tools.sanity.url,
        entitycoreUrl: settings.tools.entitycore.url,
        entityFrontendUrl: settings.tools.frontendBaseUrl,
        vlabId: thread.vlabId || undefined,
        projectId: thread.projectId || undefined,
        obiOneUrl: settings.tools.obiOne.url,
        currentFrontendUrl: body.frontend_url || undefined,
        sharedState: body.shared_state || undefined,
        threadId: thread_id,
        userId: userInfo.sub,
        openaiApiKey: settings.llm.openaiToken, // For tools that use Vercel AI SDK
        // Thumbnail generation context
        thumbnailGenerationUrl: settings.tools.thumbnailGeneration.url,
        s3Client: getS3Client(),
        bucketName: settings.storage.bucketName,
      },
      instructions:
        'You are a helpful neuroscience research assistant. ' +
        'You have access to various tools to help answer questions about brain regions, ' +
        'cell morphologies, electrical traces, and scientific literature. ' +
        'Use the tools when appropriate to provide accurate and detailed information.',
    };

    // ========================================================================
    // 9. Stream Response Using AgentsRoutine
    // ========================================================================
    const routine = new AgentsRoutine(
      settings.llm.openaiToken,
      settings.llm.openaiBaseUrl,
      settings.llm.openRouterToken
    );

    const response = await routine.streamChat(
      agentConfig,
      thread_id,
      settings.agent.maxTurns,
      settings.agent.maxParallelToolCalls,
      request.signal // Pass abort signal to detect client disconnect
    );

    // Add rate limit headers to streaming response
    const headers = new Headers(response.headers);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      headers.set(key, String(value));
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    // ========================================================================
    // Error Handling
    // ========================================================================
    console.error('Chat streaming error:', error);

    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 401);
    }

    if (error instanceof AuthorizationError) {
      return errorResponse(error.message, 403);
    }

    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
        400
      );
    }

    // Generic error response
    return errorResponse('Internal server error', 500);
  }
}
