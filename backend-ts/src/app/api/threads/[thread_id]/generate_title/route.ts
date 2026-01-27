/**
 * Thread Title Generation API Route
 * 
 * Endpoint:
 * - PATCH /api/threads/[thread_id]/generate_title - Generate thread title from first message
 * 
 * Features:
 * - Authentication required
 * - Ownership validation
 * - Rate limiting (10 requests per 60 seconds by default)
 * - Uses OpenAI structured output for title generation
 * 
 * Translated from: backend/src/neuroagent/app/routers/threads.py
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

import { getSettings } from '@/lib/config/settings';
import { prisma } from '@/lib/db/client';
import {
  validateAuth,
  AuthenticationError,
  AuthorizationError,
} from '@/lib/middleware/auth';
import { checkRateLimit } from '@/lib/middleware/rate-limit';

// Request schema
const ThreadGenerateBodySchema = z.object({
  first_user_message: z.string(),
});

// Response schema for OpenAI structured output
const ThreadGeneratedTitleSchema = z.object({
  title: z.string().max(50).describe('A short title for the conversation (max 5 words)'),
});

// Thread response schema
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
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
  });

  if (!thread) {
    throw new Error('Thread not found');
  }

  if (thread.userId !== userId) {
    throw new AuthorizationError('You do not have access to this thread');
  }

  return thread;
}

/**
 * PATCH /api/threads/[thread_id]/generate_title
 * 
 * Generate a short thread title based on the user's first message.
 * Uses OpenAI's structured output to generate a concise title (max 5 words).
 * 
 * Rate limited to prevent abuse (default: 10 requests per 60 seconds).
 * 
 * Request body:
 * - first_user_message: string - The user's first message in the thread
 * 
 * Returns:
 * - Updated thread object with generated title
 * - Rate limit headers in response
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { thread_id } = await params;

    // Load settings
    const settings = getSettings();

    // Validate authentication
    const userInfo = await validateAuth(request);

    // Get thread and validate ownership (ensures user has access)
    await getThreadWithOwnershipCheck(thread_id, userInfo.sub);

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(
      userInfo.sub,
      'generate_title',
      settings.rateLimiter.limitTitle,
      settings.rateLimiter.expiryTitle
    );

    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Access-Control-Expose-Headers': Object.keys(rateLimitResult.headers).join(','),
            ...rateLimitResult.headers,
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = ThreadGenerateBodySchema.parse(body);

    // Create OpenAI client
    const openai = createOpenAI({
      apiKey: settings.llm.openaiToken,
      baseURL: settings.llm.openaiBaseUrl,
    });

    // Prepare messages for title generation
    const messages = [
      {
        role: 'system' as const,
        content:
          "Given the user's first message of a conversation, generate a short title for this conversation (max 5 words).",
      },
      {
        role: 'user' as const,
        content: validatedBody.first_user_message,
      },
    ];

    // Prepare generation parameters
    const generateParams: any = {
      model: openai(settings.llm.suggestionModel),
      schema: ThreadGeneratedTitleSchema,
      messages,
    };

    // Add reasoning effort for GPT-5 models
    if (settings.llm.suggestionModel.includes('gpt-5')) {
      generateParams.experimental_providerOptions = {
        openai: {
          reasoning_effort: 'minimal',
        },
      };
    }

    // Generate title using OpenAI structured output
    const result = await generateObject(generateParams);

    // Extract title from result (with type assertion since we know the schema)
    const generatedTitle = (result.object as z.infer<typeof ThreadGeneratedTitleSchema>).title;

    // Update thread with generated title
    const updatedThread = await prisma.thread.update({
      where: { id: thread_id },
      data: {
        title: generatedTitle,
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

    // Return response with rate limit headers
    return NextResponse.json(response, {
      headers: {
        'Access-Control-Expose-Headers': Object.keys(rateLimitResult.headers).join(','),
        ...rateLimitResult.headers,
      },
    });
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

    console.error('Error generating thread title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
