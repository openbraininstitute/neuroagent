/**
 * Individual Thread API Routes - Get, Update, Delete
 *
 * Endpoints:
 * - GET /api/threads/[thread_id] - Get thread by ID
 * - PATCH /api/threads/[thread_id] - Update thread title
 * - DELETE /api/threads/[thread_id] - Delete thread
 *
 * Features:
 * - Authentication required
 * - Ownership validation
 * - Cascading delete for messages and related data
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { validateAuth, AuthenticationError, AuthorizationError } from '@/lib/middleware/auth';

// Request schemas
const ThreadUpdateSchema = z.object({
  title: z.string(),
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

type ThreadsRead = z.infer<typeof ThreadsReadSchema>;

/**
 * Helper function to get thread and validate ownership
 */
async function getThreadWithOwnershipCheck(threadId: string, userId: string) {
  console.log(`[DEBUG] Looking for thread: ${threadId}`);
  console.log(`[DEBUG] User ID: ${userId}`);

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
  });

  console.log(`[DEBUG] Thread found:`, thread ? 'YES' : 'NO');
  if (thread) {
    console.log(`[DEBUG] Thread owner: ${thread.userId}`);
  }

  if (!thread) {
    throw new Error('Thread not found');
  }

  if (thread.userId !== userId) {
    throw new AuthorizationError('You do not have access to this thread');
  }

  return thread;
}

/**
 * GET /api/threads/[thread_id]
 *
 * Get a specific thread by ID.
 * Validates that the authenticated user owns the thread.
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

    // Get thread and validate ownership
    const thread = await getThreadWithOwnershipCheck(thread_id, userInfo.sub);

    // Format response
    const response: ThreadsRead = {
      thread_id: thread.id,
      user_id: thread.userId,
      vlab_id: thread.vlabId,
      project_id: thread.projectId,
      title: thread.title,
      creation_date: thread.creationDate,
      update_date: thread.updateDate,
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

    if (error instanceof Error && error.message === 'Thread not found') {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    console.error('Error getting thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/threads/[thread_id]
 *
 * Update thread title.
 * Validates that the authenticated user owns the thread.
 *
 * Request body:
 * - title: string - New thread title
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { thread_id } = await params;

    // Validate authentication
    const userInfo = await validateAuth(request);

    // Get thread and validate ownership
    await getThreadWithOwnershipCheck(thread_id, userInfo.sub);

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = ThreadUpdateSchema.parse(body);

    // Update thread
    const updatedThread = await prisma.thread.update({
      where: { id: thread_id },
      data: {
        title: validatedBody.title,
        updateDate: new Date(),
      },
    });

    // Format response
    const response: ThreadsRead = {
      thread_id: updatedThread.id,
      user_id: updatedThread.userId,
      vlab_id: updatedThread.vlabId,
      project_id: updatedThread.projectId,
      title: updatedThread.title,
      creation_date: updatedThread.creationDate,
      update_date: updatedThread.updateDate,
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

    if (error instanceof Error && error.message === 'Thread not found') {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/threads/[thread_id]
 *
 * Delete thread and all associated messages, tool calls, and token consumption.
 * Validates that the authenticated user owns the thread.
 *
 * Note: Cascading deletes are handled by Prisma based on the schema relations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { thread_id } = await params;

    // Validate authentication
    const userInfo = await validateAuth(request);

    // Get thread and validate ownership
    await getThreadWithOwnershipCheck(thread_id, userInfo.sub);

    // Delete thread (cascading deletes will handle messages and related data)
    await prisma.thread.delete({
      where: { id: thread_id },
    });

    return NextResponse.json({ Acknowledged: 'true' });
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

    if (error instanceof Error && error.message === 'Thread not found') {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    console.error('Error deleting thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
