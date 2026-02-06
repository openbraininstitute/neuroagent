/**
 * Thread Messages API Route
 *
 * Translated from: backend/src/neuroagent/app/routers/threads.py
 *
 * Endpoint:
 * - GET /api/threads/[thread_id]/messages - Get messages for a thread
 *
 * Features:
 * - Authentication required
 * - Thread ownership validation
 * - Two-phase pagination for Vercel format (matches Python implementation)
 * - Entity filtering (USER, AI_MESSAGE, TOOL, AI_TOOL)
 * - Tool HIL (Human-in-Loop) status tracking
 */

import { entity } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';

import { getSettings } from '@/lib/config/settings';
import { prisma } from '@/lib/db/client';
import { validateAuth, AuthenticationError, AuthorizationError } from '@/lib/middleware/auth';
import { initializeTools } from '@/lib/tools';

/**
 * Message response schema (Vercel format)
 */
interface MessageVercel {
  id: string;
  role: string;
  createdAt: string;
  content: string;
  parts?: Array<{
    type: string;
    toolCallId?: string;
    toolName?: string;
    args?: unknown;
    result?: unknown;
  }>;
  annotations?: Array<{
    type: string;
    data?: unknown;
  }>;
}

/**
 * Paginated response
 */
interface PaginatedResponse<T> {
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  page_size: number;
}

/**
 * GET /api/threads/[thread_id]/messages
 *
 * Get all messages for a specific thread with pagination.
 *
 * Implements two-phase query strategy for Vercel format:
 * 1. First query: Get message IDs and metadata for pagination
 * 2. Second query: Fetch full messages with tool calls based on IDs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { thread_id } = await params;

    // Validate authentication
    const userInfo = await validateAuth(request);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get('page_size') || '50', 10);
    const cursor = searchParams.get('cursor');
    const vercelFormat = searchParams.get('vercel_format') === 'true';
    const sort = searchParams.get('sort') || '-creation_date';
    const entityFilterParam = searchParams.get('entity');

    // Validate thread exists and user owns it
    const thread = await prisma.thread.findUnique({
      where: { id: thread_id },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.userId !== userInfo.sub) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this thread' },
        { status: 403 }
      );
    }

    // Get tool HIL mapping (for Vercel format annotations)
    const settings = getSettings();
    const authHeader = request.headers.get('authorization');
    const jwtToken = authHeader?.replace('Bearer ', '');

    // Get tool CLASSES (not instances) - following ClassVar pattern
    const toolClasses = await initializeTools({
      exaApiKey: settings.tools.exaApiKey,
      entitycoreUrl: settings.tools.entitycore.url,
      entityFrontendUrl: settings.tools.frontendBaseUrl,
      vlabId: thread.vlabId || undefined,
      projectId: thread.projectId || undefined,
      jwtToken,
      obiOneUrl: settings.tools.obiOne.url,
      mcpConfig: settings.mcp,
    });

    // Build HIL mapping from tool classes (static properties)
    const toolHilMapping: Record<string, boolean> = {};
    toolClasses.forEach((ToolClass) => {
      toolHilMapping[ToolClass.toolName] = ToolClass.toolHil || false;
    });

    // Determine entity filter for pagination cursor query
    // CRITICAL: For Vercel format, only use USER and AI_MESSAGE for pagination
    // This matches Python backend behavior - we'll fetch AI_TOOL and TOOL later in the date range
    let entityFilter: entity[] | null = null;
    if (vercelFormat) {
      entityFilter = [entity.USER, entity.AI_MESSAGE];
    } else if (entityFilterParam) {
      entityFilter = entityFilterParam.split(',').map((e) => e as entity);
    }

    // Build where clause for first query (IDs only)
    const whereClause: any = {
      threadId: thread_id,
    };

    if (entityFilter) {
      whereClause.entity = {
        in: entityFilter,
      };
    }

    // Add cursor-based pagination
    const isDescending = sort.startsWith('-') || vercelFormat;
    if (cursor) {
      whereClause.creationDate = isDescending ? { lt: new Date(cursor) } : { gt: new Date(cursor) };
    }

    // PHASE 1: Get message IDs and metadata for pagination
    // This matches Python's first query that only selects (message_id, creation_date, entity)
    const messageCursor = await prisma.message.findMany({
      where: whereClause,
      select: {
        id: true,
        creationDate: true,
        entity: true,
      },
      orderBy: {
        creationDate: isDescending ? 'desc' : 'asc',
      },
      take: pageSize + 1,
    });

    if (messageCursor.length === 0) {
      return NextResponse.json({
        results: [],
        next_cursor: null,
        has_more: false,
        page_size: pageSize,
      });
    }

    // Determine if there are more messages
    const hasMore = messageCursor.length > pageSize;
    let dbCursor = messageCursor;

    // For non-Vercel format, trim the extra message
    if (!vercelFormat && hasMore) {
      dbCursor = messageCursor.slice(0, pageSize);
    }

    // PHASE 2: Fetch full messages with tool calls
    let dbMessages;

    if (vercelFormat) {
      // Special Vercel format logic: include all tool calls from last AI message
      // This matches Python backend: fetch ALL messages (no entity filter) within date range
      const dateConditions: any = {
        threadId: thread_id,
      };

      // Set most recent boundary to cursor if it exists
      if (cursor) {
        dateConditions.creationDate = { lt: new Date(cursor) };
      }

      // If there are more messages, set oldest bound
      if (hasMore && dbCursor.length >= 2) {
        const secondToLast = dbCursor[dbCursor.length - 2];
        const last = dbCursor[dbCursor.length - 1];

        if (secondToLast && secondToLast.entity === entity.USER) {
          // Include messages >= second to last
          dateConditions.creationDate = {
            ...dateConditions.creationDate,
            gte: secondToLast.creationDate,
          };
        } else if (last) {
          // Include messages > last (to include all tool calls from last AI)
          dateConditions.creationDate = {
            ...dateConditions.creationDate,
            gt: last.creationDate,
          };
        }
      }

      // Get all messages in the date frame (no entity filter - matches Python)
      dbMessages = await prisma.message.findMany({
        where: dateConditions,
        include: {
          toolCalls: true,
        },
        orderBy: {
          creationDate: 'desc',
        },
      });
    } else {
      // Standard format: just get messages by IDs
      // Note: We need to include TOOL entities to get tool results
      // Tool results are stored as separate Message entities, not in ToolCall.result
      const messageIds = dbCursor.map((m) => m.id);

      // Get all TOOL messages that correspond to tool calls in our message set
      const toolMessages = await prisma.message.findMany({
        where: {
          threadId: thread_id,
          entity: entity.TOOL,
        },
      });

      // Build a map of tool_call_id -> result
      const toolResultsMap = new Map<string, string>();
      for (const toolMsg of toolMessages) {
        try {
          const content = JSON.parse(toolMsg.content);
          const toolCallId = content.tool_call_id || content.toolCallId;
          const result = content.content || content.result || '';
          if (toolCallId) {
            toolResultsMap.set(toolCallId, result);
          }
        } catch (e) {
          // Skip malformed tool messages
        }
      }

      dbMessages = await prisma.message.findMany({
        where: {
          id: {
            in: messageIds,
          },
        },
        include: {
          toolCalls: true,
        },
        orderBy: {
          creationDate: isDescending ? 'desc' : 'asc',
        },
      });

      // Attach results from the map
      for (const msg of dbMessages) {
        for (const tc of msg.toolCalls) {
          (tc as any).result = toolResultsMap.get(tc.id) || null;
        }
      }
    }

    // Calculate next cursor
    const lastCursorItem = dbCursor.length > 0 ? dbCursor[dbCursor.length - 1] : null;
    const nextCursor = hasMore && lastCursorItem ? lastCursorItem.creationDate.toISOString() : null;

    // Format response
    if (vercelFormat) {
      // Post-process messages to match Python backend's format_messages_to_vercel()
      // Process in REVERSE order (oldest to newest) and buffer tool calls
      const messages: MessageVercel[] = [];
      let parts: Array<any> = [];
      let annotations: Array<any> = [];

      // Reverse to process oldest to newest
      const reversedMessages = [...dbMessages].reverse();

      for (const msg of reversedMessages) {
        const content = JSON.parse(msg.content);

        if (msg.entity === entity.USER || msg.entity === entity.AI_MESSAGE) {
          const textContent = content.content || content;
          const reasoningContent = content.reasoning;

          // Add optional reasoning
          if (reasoningContent) {
            parts.push({
              type: 'reasoning',
              reasoning: reasoningContent,
            });
          }

          const messageData: MessageVercel = {
            id: msg.id,
            role: msg.entity === entity.USER ? 'user' : 'assistant',
            createdAt: msg.creationDate.toISOString(),
            content: textContent,
          };

          // Handle AI_MESSAGE - flush buffer
          if (msg.entity === entity.AI_MESSAGE) {
            if (textContent) {
              parts.push({
                type: 'text',
                text: textContent,
              });
            }

            annotations.push({
              messageId: msg.id,
              isComplete: msg.isComplete,
            });

            messageData.parts = parts;
            messageData.annotations = annotations;
          } else if (msg.entity === entity.USER && parts.length > 0) {
            // If we encounter a user message with a non-empty buffer, add a dummy AI message
            messages.push({
              id: crypto.randomUUID(),
              role: 'assistant',
              createdAt: msg.creationDate.toISOString(),
              content: '',
              parts,
              annotations,
            });
          }

          // Reset buffer and add message
          parts = [];
          annotations = [];
          messages.push(messageData);
        } else if (msg.entity === entity.AI_TOOL) {
          // Buffer tool calls until the next AI_MESSAGE
          const textContent = content.content || '';
          const reasoningContent = content.reasoning;

          // Add optional reasoning
          if (reasoningContent) {
            parts.push({
              type: 'reasoning',
              reasoning: reasoningContent,
            });
          }

          // Add text content
          if (textContent) {
            parts.push({
              type: 'text',
              text: textContent,
            });
          }

          // Add tool calls to buffer
          for (const tc of msg.toolCalls) {
            const requiresValidation = toolHilMapping[tc.name] || false;
            let status: 'accepted' | 'rejected' | 'pending' | 'not_required';

            if (tc.validated === true) {
              status = 'accepted';
            } else if (tc.validated === false) {
              status = 'rejected';
            } else if (!requiresValidation) {
              status = 'not_required';
            } else {
              status = 'pending';
            }

            parts.push({
              type: 'tool-invocation',
              toolInvocation: {
                toolCallId: tc.id,
                toolName: tc.name,
                args: JSON.parse(tc.arguments),
                state: 'call',
              },
            });

            annotations.push({
              toolCallId: tc.id,
              validated: status,
              isComplete: msg.isComplete,
            });
          }
        } else if (msg.entity === entity.TOOL) {
          // Merge tool result back into buffered part
          const toolCallId = content.tool_call_id || content.toolCallId;
          const toolResult = content.content || content.result || '';

          // Find the buffered tool call
          const toolCallPart = parts.find(
            (part) =>
              part.type === 'tool-invocation' && part.toolInvocation?.toolCallId === toolCallId
          );

          if (toolCallPart) {
            toolCallPart.toolInvocation.result = toolResult;
            toolCallPart.toolInvocation.state = 'result';
          }

          // Update annotation isComplete
          const annotation = annotations.find((ann) => ann.toolCallId === toolCallId);
          if (annotation) {
            annotation.isComplete = msg.isComplete;
          }
        }
      }

      // If the tool call buffer is not empty, add a dummy AI message
      if (parts.length > 0) {
        const lastMessage = reversedMessages[reversedMessages.length - 1];
        messages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          createdAt: lastMessage?.creationDate.toISOString() || new Date().toISOString(),
          content: '',
          parts,
          annotations,
        });
      }

      // Reverse back to descending order (newest first)
      const orderedMessages = messages.reverse();

      const response: PaginatedResponse<MessageVercel> = {
        results: orderedMessages,
        next_cursor: nextCursor,
        has_more: hasMore,
        page_size: pageSize,
      };

      return NextResponse.json(response);
    } else {
      // Standard format
      const formattedMessages = dbMessages.map((msg) => ({
        message_id: msg.id,
        entity: msg.entity,
        thread_id: msg.threadId,
        is_complete: msg.isComplete,
        creation_date: msg.creationDate.toISOString(),
        msg_content: JSON.parse(msg.content),
        tool_calls: msg.toolCalls.map((tc) => ({
          tool_call_id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments),
          result: (tc as any).result ? JSON.parse((tc as any).result) : null,
          validated: tc.validated,
        })),
      }));

      const response: PaginatedResponse<any> = {
        results: formattedMessages,
        next_cursor: nextCursor,
        has_more: hasMore,
        page_size: pageSize,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: 'Authentication failed', message: error.message },
        { status: 401 }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: 'Authorization failed', message: error.message },
        { status: 403 }
      );
    }

    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
