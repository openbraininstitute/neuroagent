/**
 * Unit Tests for Chat Streaming API Route
 *
 * Tests authentication, rate limiting, thread validation, and streaming functionality.
 *
 * **Validates: Requirements 13.3**
 *
 * This test suite validates:
 * 1. Authentication requirement - JWT token validation via Keycloak
 * 2. Rate limiting - Per-user rate limits enforced correctly
 * 3. Thread ownership validation - Users can only access their own threads
 * 4. Query size limits - Messages exceeding max size are rejected
 * 5. Project access control - Users must have access to vlab/project
 * 6. Error handling - Proper error responses for various failure scenarios
 * 7. Message persistence - User messages are saved correctly to database
 * 8. Thread updates - Thread updateDate is updated on new messages
 * 9. Rate limit headers - Rate limit information included in responses
 *
 * Requirements tested:
 * - 13.3: Test all API endpoints
 * - 13.6: Test streaming responses
 * - 13.7: Test error handling scenarios
 * - 8.1: JWT authentication integration
 * - 8.2: User information extraction from tokens
 * - 8.4: Virtual lab and project access validation
 * - 9.1: Rate limiting enforcement
 * - 9.3: Rate limit headers in responses
 * - 14.1: API endpoint path compatibility
 * - 14.2: Request/response schema compatibility
 * - 14.4: Error response format compatibility
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

    const response = await POST(request, {
      params: Promise.resolve({ thread_id: nonExistentThreadId }),
    });

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

  it('should return 403 when user lacks project access', async () => {
    const { validateAuth, validateProject, AuthorizationError } =
      await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    const vlabId = crypto.randomUUID();
    const projectId = crypto.randomUUID();

    // Create a thread with vlab and project
    await prisma.thread.create({
      data: {
        id: testThreadId,
        userId: testUserId,
        vlabId,
        projectId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [], // No groups, so no project access
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {},
      remaining: 20,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    // Mock validateProject to throw AuthorizationError
    vi.mocked(validateProject).mockImplementation(() => {
      throw new AuthorizationError('Access denied: User does not have access to this project');
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
    const body = await response.json();
    expect(body.error).toContain('Access denied');
  });

  it('should include rate limit headers in successful streaming response', async () => {
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

    const rateLimitHeaders = {
      'X-RateLimit-Limit': '20',
      'X-RateLimit-Remaining': '15',
      'X-RateLimit-Reset': String(Date.now() + 3600000),
    };

    vi.mocked(checkRateLimit).mockResolvedValue({
      limited: false,
      headers: rateLimitHeaders,
      remaining: 15,
      limit: 20,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test message' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('15');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should update thread updateDate when message is sent', async () => {
    const { validateAuth } = await import('@/lib/middleware/auth');
    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');

    const initialDate = new Date('2024-01-01T00:00:00Z');

    await prisma.thread.create({
      data: {
        id: testThreadId,
        userId: testUserId,
        title: 'Test Thread',
        creationDate: initialDate,
        updateDate: initialDate,
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
      body: JSON.stringify({ content: 'Test message' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    // Verify thread updateDate was updated
    const updatedThread = await prisma.thread.findUnique({
      where: { id: testThreadId },
    });

    expect(updatedThread).toBeDefined();
    expect(updatedThread!.updateDate.getTime()).toBeGreaterThan(initialDate.getTime());
  });

  it('should handle malformed JSON in request body', async () => {
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
      body: 'invalid json{',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('should save user message with correct format', async () => {
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

    const messageContent = 'What is a neuron?';

    const request = new NextRequest('http://localhost/api/qa/chat_streamed/test-thread-123', {
      method: 'POST',
      body: JSON.stringify({ content: messageContent }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    await POST(request, { params: Promise.resolve({ thread_id: testThreadId }) });

    // Verify message was saved correctly
    const messages = await prisma.message.findMany({
      where: { threadId: testThreadId },
    });

    expect(messages.length).toBe(1);
    expect(messages[0]?.entity).toBe(Entity.USER);
    expect(messages[0]?.isComplete).toBe(true);

    const content = JSON.parse(messages[0]?.content || '{}');
    expect(content.role).toBe('user');
    expect(content.content).toBe(messageContent);
  });
});
