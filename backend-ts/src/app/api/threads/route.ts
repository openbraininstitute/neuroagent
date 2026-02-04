/**
 * Threads API Routes - List and Create
 *
 * Endpoints:
 * - GET /api/threads - List threads for authenticated user
 * - POST /api/threads - Create a new thread
 *
 * Features:
 * - Authentication required
 * - Virtual lab and project access validation
 * - Pagination support
 * - Filtering by creation date
 * - Sorting by creation_date or update_date
 * - Option to exclude empty threads
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import {
  validateAuth,
  validateProject,
  AuthenticationError,
  AuthorizationError,
} from '@/lib/middleware/auth';

// Request schemas
const ThreadCreateSchema = z.object({
  title: z.string().default('New chat'),
  virtual_lab_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

// Response schemas
const ThreadsReadSchema = z.object({
  thread_id: z.string().uuid(),
  user_id: z.string().uuid(),
  vlab_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  title: z.string(),
  creation_date: z.date(),
  update_date: z.date(),
});

const PaginatedResponseSchema = z.object({
  next_cursor: z.date().nullable(),
  has_more: z.boolean(),
  page_size: z.number(),
  results: z.array(ThreadsReadSchema),
});

type ThreadsRead = z.infer<typeof ThreadsReadSchema>;
type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;

/**
 * GET /api/threads
 *
 * List threads for the authenticated user with pagination and filtering.
 *
 * Query parameters:
 * - virtual_lab_id: UUID - Filter by virtual lab
 * - project_id: UUID - Filter by project
 * - exclude_empty: boolean - Exclude threads with no messages
 * - creation_date_lte: ISO datetime - Filter threads created before this date
 * - creation_date_gte: ISO datetime - Filter threads created after this date
 * - sort: string - Sort order (update_date, creation_date, -update_date, -creation_date)
 * - cursor: ISO datetime - Pagination cursor
 * - page_size: number - Number of results per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const userInfo = await validateAuth(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const virtualLabId = searchParams.get('virtual_lab_id');
    const projectId = searchParams.get('project_id');
    const excludeEmpty = searchParams.get('exclude_empty') === 'true';
    const creationDateLte = searchParams.get('creation_date_lte');
    const creationDateGte = searchParams.get('creation_date_gte');
    const sort = searchParams.get('sort') || '-update_date';
    const cursor = searchParams.get('cursor');
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // Validate project access if provided
    if (virtualLabId || projectId) {
      validateProject(userInfo.groups, virtualLabId, projectId);
    }

    // Determine sort column and direction
    const sortColumn = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'desc' : 'asc';

    if (!['update_date', 'creation_date'].includes(sortColumn)) {
      return NextResponse.json({ error: 'Invalid sort parameter' }, { status: 400 });
    }

    // Build where conditions
    const whereConditions: any = {
      userId: userInfo.sub,
      vlabId: virtualLabId || null,
      projectId: projectId || null,
    };

    // Add creation date filters
    if (creationDateLte) {
      whereConditions.creationDate = {
        ...whereConditions.creationDate,
        lte: new Date(creationDateLte),
      };
    }
    if (creationDateGte) {
      whereConditions.creationDate = {
        ...whereConditions.creationDate,
        gte: new Date(creationDateGte),
      };
    }

    // Add cursor condition
    if (cursor) {
      const cursorDate = new Date(cursor);
      whereConditions[sortColumn === 'update_date' ? 'updateDate' : 'creationDate'] = {
        ...whereConditions[sortColumn === 'update_date' ? 'updateDate' : 'creationDate'],
        [sortDirection === 'desc' ? 'lt' : 'gt']: cursorDate,
      };
    }

    // Query threads
    const threads = await prisma.thread.findMany({
      where: whereConditions,
      orderBy: {
        [sortColumn === 'update_date' ? 'updateDate' : 'creationDate']: sortDirection,
      },
      take: pageSize + 1, // Fetch one extra to determine if there are more
      ...(excludeEmpty && {
        where: {
          ...whereConditions,
          messages: {
            some: {},
          },
        },
      }),
    });

    // Determine if there are more results
    const hasMore = threads.length > pageSize;
    const results = hasMore ? threads.slice(0, -1) : threads;

    // Format response
    const lastResult = results[results.length - 1];
    const response: PaginatedResponse = {
      next_cursor: lastResult
        ? lastResult[sortColumn === 'update_date' ? 'updateDate' : 'creationDate']
        : null,
      has_more: hasMore,
      page_size: pageSize,
      results: results.map((thread) => ({
        thread_id: thread.id,
        user_id: thread.userId,
        vlab_id: thread.vlabId,
        project_id: thread.projectId,
        title: thread.title,
        creation_date: thread.creationDate,
        update_date: thread.updateDate,
      })),
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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error listing threads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/threads
 *
 * Create a new thread for the authenticated user.
 *
 * Request body:
 * - title: string - Thread title (default: "New chat")
 * - virtual_lab_id: UUID | null - Virtual lab ID
 * - project_id: UUID | null - Project ID
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const userInfo = await validateAuth(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = ThreadCreateSchema.parse(body);

    // Validate project access if provided
    if (validatedBody.virtual_lab_id || validatedBody.project_id) {
      validateProject(userInfo.groups, validatedBody.virtual_lab_id, validatedBody.project_id);
    }

    // Create thread
    const threadId = crypto.randomUUID();
    const newThread = await prisma.thread.create({
      data: {
        id: threadId,
        userId: userInfo.sub,
        title: validatedBody.title,
        vlabId: validatedBody.virtual_lab_id || null,
        projectId: validatedBody.project_id || null,
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    // Format response
    const response: ThreadsRead = {
      thread_id: newThread.id,
      user_id: newThread.userId,
      vlab_id: newThread.vlabId,
      project_id: newThread.projectId,
      title: newThread.title,
      creation_date: newThread.creationDate,
      update_date: newThread.updateDate,
    };

    return NextResponse.json(response, { status: 201 });
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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
