/**
 * End-to-End Tests for Error Scenarios
 *
 * Feature: typescript-backend-migration
 * Task: 27.1 Write end-to-end tests for complete user flows
 * Requirements: 13.2
 *
 * These tests verify error handling in complete user flows:
 * - Tool execution failures
 * - LLM provider errors
 * - Database transaction failures
 * - Rate limiting scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/qa/chat_streamed/[thread_id]/route';
import { prisma } from '@/lib/db/client';
import { Entity } from '@/types';
import { streamText } from 'ai';

// Mock the AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((config) => config),
}));

// Mock providers
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ type: 'openai-model' }))),
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => ({ type: 'openrouter-model' }))),
}));

// Mock middleware
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

vi.mock('@/lib/tools', () => ({
  initializeTools: vi.fn(),
}));

describe('End-to-End: Error Scenarios', () => {
  let testThreadId: string;
  let testUserId: string;

  beforeEach(async () => {
    testThreadId = crypto.randomUUID();
    testUserId = crypto.randomUUID();

    await prisma.message.deleteMany({ where: { threadId: testThreadId } });
    await prisma.thread.deleteMany({ where: { id: testThreadId } });

    vi.clearAllMocks();

    const { validateAuth } = await import('@/lib/middleware/auth');
    vi.mocked(validateAuth).mockResolvedValue({
      sub: testUserId,
      groups: [],
    });

    const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
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

    // Setup default generateObject mock for tool filtering
    const { generateObject } = await import('ai');
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        selectedTools: [],
        reasoning: 'No tools needed for this query',
      },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      warnings: undefined,
      rawResponse: undefined,
      experimental_providerMetadata: undefined,
    } as any);
  });

  afterEach(async () => {
    await prisma.message.deleteMany({ where: { threadId: testThreadId } });
    await prisma.thread.deleteMany({ where: { id: testThreadId } });
  });

  describe('Tool Execution Errors', () => {
    it('should handle tool execution failure gracefully', async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Tool Error Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Mock tool that throws error
      const mockTool = {
        metadata: {
          name: 'failing_tool',
          description: 'A tool that fails',
        },
        toVercelTool: vi.fn(() => ({
          description: 'A tool that fails',
          parameters: {},
          execute: vi.fn(async () => {
            throw new Error('Tool execution failed');
          }),
        })),
      };

      const { initializeTools } = await import('@/lib/tools');
      vi.mocked(initializeTools).mockResolvedValue([mockTool as any]);

      // Mock streamText to handle tool error
      const mockStreamText = vi.mocked(streamText);
      mockStreamText.mockResolvedValue({
        toDataStreamResponse: vi.fn(() => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode('3:{"error":"Tool execution failed"}\n')
              );
              controller.enqueue(
                encoder.encode('0:"I encountered an error while using the tool."\n')
              );
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }),
        usage: Promise.resolve({ promptTokens: 50, completionTokens: 20, totalTokens: 70 }),
        text: Promise.resolve('I encountered an error while using the tool.'),
        finishReason: Promise.resolve('stop'),
        experimental_providerMetadata: undefined,
      } as any);

      const request = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Use the failing tool' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ thread_id: testThreadId }),
      });

      // Should still return 200 as the stream started successfully
      expect(response.status).toBe(200);
    });
  });

  describe('LLM Provider Errors', () => {
    it('should handle LLM provider timeout', async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Provider Timeout Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      const { initializeTools } = await import('@/lib/tools');
      vi.mocked(initializeTools).mockResolvedValue([]);

      // Mock streamText to throw timeout error
      const mockStreamText = vi.mocked(streamText);
      mockStreamText.mockRejectedValue(new Error('Request timeout'));

      const request = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ thread_id: testThreadId }),
      });

      // Should return 200 with error in stream (data stream protocol)
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    });

    it('should handle invalid model configuration', async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Invalid Model Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      const { initializeTools } = await import('@/lib/tools');
      vi.mocked(initializeTools).mockResolvedValue([]);

      // Mock streamText to throw model error
      const mockStreamText = vi.mocked(streamText);
      mockStreamText.mockRejectedValue(new Error('Model not found'));

      const request = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: 'Test message',
            model: 'invalid-model-name',
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ thread_id: testThreadId }),
      });

      // Should return 200 with error in stream (data stream protocol)
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle rate limit exceeded during conversation', async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Rate Limit Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Mock rate limit exceeded
      const { checkRateLimit } = await import('@/lib/middleware/rate-limit');
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

      const request = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ thread_id: testThreadId }),
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('Database Transaction Scenarios', () => {
    it('should handle database connection failure', async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'DB Error Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      const { initializeTools } = await import('@/lib/tools');
      vi.mocked(initializeTools).mockResolvedValue([]);

      // Mock streamText
      const mockStreamText = vi.mocked(streamText);
      mockStreamText.mockResolvedValue({
        toDataStreamResponse: vi.fn(() => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('0:"Response"\n'));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }),
        usage: Promise.resolve({ promptTokens: 30, completionTokens: 10, totalTokens: 40 }),
        text: Promise.resolve('Response'),
        finishReason: Promise.resolve('stop'),
        experimental_providerMetadata: undefined,
      } as any);

      // Temporarily mock prisma.message.create to fail
      const originalCreate = prisma.message.create;
      prisma.message.create = vi.fn().mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ thread_id: testThreadId }),
      });

      // Restore original function
      prisma.message.create = originalCreate;

      // Should handle database error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Concurrent Request Scenarios', () => {
    it('should handle multiple concurrent requests to same thread', async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Concurrent Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      const { initializeTools } = await import('@/lib/tools');
      vi.mocked(initializeTools).mockResolvedValue([]);

      // Mock streamText
      const mockStreamText = vi.mocked(streamText);
      mockStreamText.mockResolvedValue({
        toDataStreamResponse: vi.fn(() => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              // Simulate slow response
              await new Promise((resolve) => setTimeout(resolve, 50));
              controller.enqueue(encoder.encode('0:"Response"\n'));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }),
        usage: Promise.resolve({ promptTokens: 30, completionTokens: 10, totalTokens: 40 }),
        text: Promise.resolve('Response'),
        finishReason: Promise.resolve('stop'),
        experimental_providerMetadata: undefined,
      } as any);

      // Make two concurrent requests
      const request1 = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'First message' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const request2 = new NextRequest(
        `http://localhost/api/qa/chat_streamed/${testThreadId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Second message' }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Execute concurrently
      const [response1, response2] = await Promise.all([
        POST(request1, { params: Promise.resolve({ thread_id: testThreadId }) }),
        POST(request2, { params: Promise.resolve({ thread_id: testThreadId }) }),
      ]);

      // Both should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify both messages were saved
      const messages = await prisma.message.findMany({
        where: { threadId: testThreadId, entity: Entity.USER },
      });

      expect(messages.length).toBe(2);
    });
  });
});
