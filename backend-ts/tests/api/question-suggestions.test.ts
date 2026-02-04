/**
 * Tests for Question Suggestions API Route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/qa/question_suggestions/route';
import { prisma } from '@/lib/db/client';
import { Entity } from '@/types';

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  validateAuth: vi.fn().mockResolvedValue({
    sub: 'test-user-id',
    email: 'test@example.com',
    groups: [],
  }),
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    limited: false,
    headers: {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '99',
      'X-RateLimit-Reset': String(Date.now() + 86400000),
    },
  }),
}));

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      suggestions: [
        { question: 'Find papers about neuroscience' },
        { question: 'Show me brain regions' },
        { question: 'Analyze cell morphologies' },
      ],
    },
  }),
  openai: vi.fn(() => 'mocked-model'),
}));

// Mock the OpenAI SDK to prevent real API calls
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mocked-openai-model')),
}));

vi.mock('@/lib/tools', () => ({
  initializeTools: vi.fn().mockResolvedValue([
    // Mock tool CLASSES (not instances)
    {
      toolName: 'web_search',
      toolDescription: 'Search the web for information',
      toolHil: false,
    },
    {
      toolName: 'literature_search',
      toolDescription: 'Search scientific literature',
      toolHil: false,
    },
  ]),
}));

describe('Question Suggestions API', () => {
  let testThreadId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Generate unique IDs for each test to avoid conflicts
    testThreadId = crypto.randomUUID();
    testUserId = crypto.randomUUID();

    // Clean up test data
    await prisma.message.deleteMany({
      where: { threadId: testThreadId },
    });
    await prisma.thread.deleteMany({
      where: { id: testThreadId },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany({
      where: { threadId: testThreadId },
    });
    await prisma.thread.deleteMany({
      where: { id: testThreadId },
    });
  });

  describe('Out-of-chat suggestions', () => {
    it('should generate suggestions without thread ID', async () => {
      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          frontendUrl: 'https://example.com/app/virtual-lab/vlab-id/proj-id/explore',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions).toHaveLength(3);
    });

    it('should handle missing frontend URL', async () => {
      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions).toHaveLength(3);
    });
  });

  describe('In-chat suggestions', () => {
    it('should generate suggestions based on conversation history', async () => {
      // Create test thread
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create test messages
      await prisma.message.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            threadId: testThreadId,
            entity: Entity.USER,
            content: JSON.stringify({ role: 'user', content: 'Tell me about neurons' }),
            isComplete: true,
            creationDate: new Date(),
          },
          {
            id: crypto.randomUUID(),
            threadId: testThreadId,
            entity: Entity.AI_MESSAGE,
            content: JSON.stringify({
              role: 'assistant',
              content: 'Neurons are specialized cells...',
            }),
            isComplete: true,
            creationDate: new Date(),
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          threadId: testThreadId,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions).toHaveLength(3);
    });

    it('should fall back to out-of-chat mode if no messages exist', async () => {
      // Create thread without messages
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Empty Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          threadId: testThreadId,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions).toHaveLength(3);
    });
  });

  describe('Authentication and rate limiting', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');
      vi.mocked(validateAuth).mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 429 when rate limited', async () => {
      const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        limited: true,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 86400000),
        },
      });

      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should include rate limit headers in response', async () => {
      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
    });
  });

  describe('Error handling', () => {
    it('should return 400 for invalid request body', async () => {
      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          threadId: 'invalid-uuid',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Validation Error');
    });

    it('should handle invalid frontend URL gracefully', async () => {
      const request = new Request('http://localhost/api/qa/question_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          frontendUrl: 'https://example.com/invalid-path',
        }),
      });

      const response = await POST(request);
      // Invalid URLs are caught and logged, but suggestions are still generated
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions).toHaveLength(3);
    });
  });
});
