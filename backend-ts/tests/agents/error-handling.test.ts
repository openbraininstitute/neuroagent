/**
 * Error Handling Tests for Agent Routine
 *
 * These tests verify that errors are properly streamed back to the client
 * in the Vercel AI SDK data stream format.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentsRoutine } from '@/lib/agents/routine';
import { prisma } from '@/lib/db/client';

// Mock Prisma client
vi.mock('@/lib/db/client', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

// Mock OpenAI provider
const mockOpenAIProvider = vi.fn(() => ({ type: 'openai-model' }));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockOpenAIProvider),
}));

// Mock OpenRouter provider
const mockOpenRouterProvider = vi.fn(() => ({ type: 'openrouter-model' }));
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => mockOpenRouterProvider),
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn()),
}));

describe('AgentsRoutine Error Handling', () => {
  let routine: AgentsRoutine;

  beforeEach(() => {
    routine = new AgentsRoutine('test-openai-key', undefined, 'test-openrouter-key');
    vi.clearAllMocks();
  });

  describe('database errors', () => {
    it('should return error stream when database query fails', async () => {
      // Mock database error
      (prisma.message.findMany as any).mockRejectedValue(new Error('Database connection failed'));

      const agentConfig = {
        model: 'gpt-4',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routine.streamChat(agentConfig, 'test-thread-id');

      // Verify response is a Response object
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
      expect(response.headers.get('X-Vercel-AI-Data-Stream')).toBe('v1');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // Verify error format: 3:"error message"\n
      expect(result).toMatch(/^3:".*"\n$/);
      expect(result).toContain('Database connection failed');
    });

    it('should include detailed error in development mode', async () => {
      // Mock database error with stack trace
      const error = new Error('Test error');
      (prisma.message.findMany as any).mockRejectedValue(error);

      const agentConfig = {
        model: 'gpt-4',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routine.streamChat(agentConfig, 'test-thread-id');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // In development, should include error message
      expect(result).toContain('Test error');
    });
  });

  describe('provider configuration errors', () => {
    it('should return error stream when provider is not configured', async () => {
      const routineWithoutProviders = new AgentsRoutine();

      (prisma.message.findMany as any).mockResolvedValue([]);

      const agentConfig = {
        model: 'gpt-4',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routineWithoutProviders.streamChat(agentConfig, 'test-thread-id');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // Verify error format
      expect(result).toMatch(/^3:".*"\n$/);
      expect(result).toContain('OpenRouter provider not configured');
    });

    it('should return error stream for unconfigured OpenRouter', async () => {
      const routineWithOnlyOpenAI = new AgentsRoutine('test-key');

      (prisma.message.findMany as any).mockResolvedValue([]);

      const agentConfig = {
        model: 'openrouter/anthropic/claude-3',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routineWithOnlyOpenAI.streamChat(agentConfig, 'test-thread-id');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // Verify error format
      expect(result).toMatch(/^3:".*"\n$/);
      expect(result).toContain('OpenRouter provider not configured');
    });
  });

  describe('error message formatting', () => {
    it('should handle string errors', async () => {
      (prisma.message.findMany as any).mockRejectedValue('String error message');

      const agentConfig = {
        model: 'gpt-4',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routine.streamChat(agentConfig, 'test-thread-id');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // When error is thrown before stream creation, it's caught by outer catch block
      // which returns "Unknown error" for non-Error objects
      expect(result).toContain('Unknown error');
    });

    it('should handle null errors', async () => {
      (prisma.message.findMany as any).mockRejectedValue(null);

      const agentConfig = {
        model: 'gpt-4',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routine.streamChat(agentConfig, 'test-thread-id');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // When error is thrown before stream creation, it's caught by outer catch block
      // which returns "Unknown error" for non-Error objects
      expect(result).toContain('Unknown error');
    });

    it('should handle object errors', async () => {
      (prisma.message.findMany as any).mockRejectedValue({ code: 'ERR_TEST', message: 'Test' });

      const agentConfig = {
        model: 'gpt-4',
        temperature: 1,
        tools: [],
        instructions: 'Test instructions',
      };

      const response = await routine.streamChat(agentConfig, 'test-thread-id');

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      // Should contain stringified object
      expect(result).toMatch(/^3:".*"\n$/);
    });
  });
});
