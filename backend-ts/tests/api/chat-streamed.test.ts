/**
 * Tests for Chat Streaming API Route
 *
 * Tests authentication, rate limiting, thread validation, and streaming functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '@/app/api/qa/chat_streamed/[thread_id]/route';
import { prisma } from '@/lib/db/client';
import { Entity } from '@/types';

// Mock the middleware and agent modules
vi.mock('@/lib/middleware/auth', () => ({
  validateAuth: vi.fn(),
  validateProject: vi.fn(),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
  AuthorizationError: class AuthorizationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthorizationError';
    }
  },
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/agents/routine', () => ({
  AgentsRoutine: vi.fn().mockImplementation(() => ({
    streamChat: vi.fn().mockResolvedValue(
      new Response('data: test\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    ),
  })),
}));

vi.mock('@/lib/tools', () => ({
  initializeTools: vi.fn().mockResolvedValue([]),
}));

// CRITICAL: Mock tool filtering to prevent real LLM API calls
vi.mock('@/lib/utils/tool-filtering', () => ({
  filterToolsAndModelByConversation: vi.fn().mockResolvedValue({
    filteredTools: [],
    model: 'openai/gpt-4',
    reasoning: 'low',
  }),
}));

describe('Chat Streaming API Route', () => {
  let testThreadId: string;
  let testUserId: string;


  beforeEach(async () => {
    // Generate unique IDs for each test to avoid conflicts
    testThreadId = crypto.randomUUID();
    testUserId = crypto.randomUUID();

    // Clean up any existing test data
    await prisma.message.deleteMany({ where: { threadId: testThreadId } });
    await prisma.thread.deleteMany({ where: { id: testThreadId } });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany({ where: { threadId: testThreadId } });
    await prisma.thread.deleteMany({ where: { id: testThreadId } });
    vi.clearAllMocks();
  });

  it('should return 401 for unauthenticated requests', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { AuthenticationError } = await import('@/lib/middleware/auth');

    vi.mocked(validateAuth).mockRejectedValue(
      new AuthenticationError('Missing or invalid Authorization header')
    );

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('should return 429 when rate limit is exceeded', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: true,
      headers: {
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Date.now() + 3600000),
      },
      remaining: 0,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
  });

  it('should return 404 for non-existent thread', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {},
      remaining: 20,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    const nonExistentThreadId = crypto.randomUUID();

    const request = new NextRequest(
      `http://localhost/api/qa/chat_streamed/${nonExistentThreadId}`,
      {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      }
    );

    const response = await POST(request, { params: Promise.resolve({ thread_id: nonExistentThreadId }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 for thread owned by different user', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    // Create a thread owned by a different user
    await prisma.thread.create({
      data: {
        id: testThreadId,
        userId: crypto.randomUUID(), // Different user
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {},
      remaining: 20,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid request body', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    await prisma.thread.create({
      data: {
        id: testThreadId,
        userId: testUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {},
      remaining: 20,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: '' }), // Empty content
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(400);
  });

  it('should stream response for valid request', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    await prisma.thread.create({
      data: {
        id: testThreadId,
        userId: testUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': '19',
        'X-RateLimit-Reset': String(Date.now() + 3600000),
      },
      remaining: 19,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello, how are you?' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('20');

    // Verify user message was saved
    const messages = await prisma.message.findMany({
      where: { threadId: testThreadId },
    });

    expect(messages.length).toBe(1);
    expect(messages[0]?.entity).toBe(Entity.USER);
    const content = JSON.parse(messages[0]?.content || '{}');
    expect(content.content).toBe('Hello, how are you?');
  });

  it('should return 413 for query that exceeds max size', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    await prisma.thread.create({
      data: {
        id: testThreadId,
        userId: testUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {},
      remaining: 20,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    // Create a very long message
    const longContent = 'a'.repeat(20000);

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: longContent }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(413);
  });
});
