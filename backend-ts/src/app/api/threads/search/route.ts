/**
 * Thread Search API Route
 * 
 * Endpoint:
 * - GET /api/threads/search - Full-text search on messages
 * 
 * Features:
 * - Full-text search using PostgreSQL TSVECTOR
 * - Authentication required
 * - Virtual lab and project filtering
 * - Returns distinct threads with matching messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { validateAuth, validateProject, AuthenticationError, AuthorizationError } from '@/lib/middleware/auth';

// Response schemas
const SearchMessagesResultSchema = z.object({
  thread_id: z.string().uuid(),
  message_id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
});

const SearchMessagesListSchema = z.object({
  result_list: z.array(SearchMessagesResultSchema),
});

type SearchMessagesResult = z.infer<typeof SearchMessagesResultSchema>;
type SearchMessagesList = z.infer<typeof SearchMessagesListSchema>;

/**
 * GET /api/threads/search
 * 
 * Full-text search on messages within threads.
 * Uses PostgreSQL's full-text search capabilities with TSVECTOR.
 * 
 * Query parameters:
 * - query: string (required) - Search query
 * - virtual_lab_id: UUID - Filter by virtual lab
 * - project_id: UUID - Filter by project
 * - limit: number - Maximum number of results (default: 20)
 * 
 * Returns:
 * - List of threads with matching messages
 * - One result per thread (the most relevant message)
 * - Results ranked by relevance using ts_rank
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const userInfo = await validateAuth(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const virtualLabId = searchParams.get('virtual_lab_id');
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate required parameters
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Validate project access if provided
    if (virtualLabId || projectId) {
      validateProject(userInfo.groups, virtualLabId, projectId);
    }

    // Perform full-text search using raw SQL
    // This is necessary because Prisma doesn't fully support PostgreSQL full-text search operators
    const results = await prisma.$queryRaw<Array<{
      thread_id: string;
      message_id: string;
      title: string;
      content: string;
    }>>`
      SELECT DISTINCT ON (m.thread_id)
        m.thread_id,
        m.message_id,
        t.title,
        m.content
      FROM messages m
      JOIN threads t ON m.thread_id = t.thread_id
      WHERE t.user_id = ${userInfo.sub}::uuid
        AND t.vlab_id = ${virtualLabId ? virtualLabId : null}::uuid
        AND t.project_id = ${projectId ? projectId : null}::uuid
        AND m.entity IN ('USER', 'AI_MESSAGE')
        AND m.search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY m.thread_id, ts_rank(m.search_vector, plainto_tsquery('english', ${query})) DESC, m.creation_date DESC
      LIMIT ${limit}
    `;

    // Parse content JSON and format response
    const formattedResults: SearchMessagesResult[] = results.map((result) => {
      let content = '';
      try {
        const parsed = JSON.parse(result.content);
        content = parsed.content || '';
      } catch (error) {
        console.error('Error parsing message content:', error);
        content = result.content;
      }

      return {
        thread_id: result.thread_id,
        message_id: result.message_id,
        title: result.title,
        content,
      };
    });

    const response: SearchMessagesList = {
      result_list: formattedResults,
    };

    return NextResponse.json(response);
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

    console.error('Error searching threads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
