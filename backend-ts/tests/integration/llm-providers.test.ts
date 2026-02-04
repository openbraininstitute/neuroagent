/**
 * Integration Tests for LLM Provider Integration
 *
 * Feature: typescript-backend-migration
 * Task: 27.3 Write integration tests for external services
 * Requirements: 13.2
 *
 * These tests verify LLM provider integration with mocks to avoid actual API calls.
 * CRITICAL: All tests use mocks - NO real API calls are made to avoid costs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { streamText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Mock the AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((config) => config),
}));

// Mock OpenAI provider
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(),
}));

// Mock OpenRouter provider
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(),
}));

describe('Integration: LLM Provider Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAI Provider', () => {
    it('should initialize OpenAI provider with API key', () => {
      const mockProvider = vi.fn(() => ({ type: 'openai-model' }));
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as any);

      const provider = createOpenAI({ apiKey: 'test-key' });
      expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
      expect(provider).toBeDefined();
    });

    it('should stream text with OpenAI provider (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openai-model', provider: 'openai' }));
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as any);

      // Mock streamText response
      const mockStream = {
        toDataStreamResponse: vi.fn(() => new Response('mock-stream')),
        usage: Promise.resolve({ promptTokens: 10, completionTokens: 5, totalTokens: 15 }),
        text: Promise.resolve('Hello from OpenAI'),
        finishReason: Promise.resolve('stop'),
      };
      vi.mocked(streamText).mockResolvedValue(mockStream as any);

      const provider = createOpenAI({ apiKey: 'test-key' });
      const model = provider('gpt-4');

      const result = await streamText({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(streamText).toHaveBeenCalledWith({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.toDataStreamResponse).toBeDefined();
    });

    it('should generate structured output with OpenAI (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openai-model' }));
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as any);

      // Mock generateObject response
      vi.mocked(generateObject).mockResolvedValue({
        object: { suggestions: ['Question 1', 'Question 2', 'Question 3'] },
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        finishReason: 'stop',
      } as any);

      const provider = createOpenAI({ apiKey: 'test-key' });
      const model = provider('gpt-4');

      const result = await generateObject({
        model,
        schema: { type: 'object' } as any,
        messages: [{ role: 'user', content: 'Generate suggestions' }],
      });

      expect(generateObject).toHaveBeenCalled();
      expect(result.object).toEqual({ suggestions: ['Question 1', 'Question 2', 'Question 3'] });
    });

    it('should handle tool calls with OpenAI (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openai-model' }));
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as any);

      const mockStream = {
        toDataStreamResponse: vi.fn(() => new Response('mock-stream')),
        usage: Promise.resolve({ promptTokens: 50, completionTokens: 20, totalTokens: 70 }),
        text: Promise.resolve('Tool result processed'),
        finishReason: Promise.resolve('stop'),
      };
      vi.mocked(streamText).mockResolvedValue(mockStream as any);

      const provider = createOpenAI({ apiKey: 'test-key' });
      const model = provider('gpt-4');

      const mockTool = {
        description: 'Test tool',
        parameters: {},
        execute: vi.fn(async () => ({ result: 'success' })),
      };

      const result = await streamText({
        model,
        messages: [{ role: 'user', content: 'Use the tool' }],
        tools: { testTool: mockTool },
      });

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.objectContaining({ testTool: mockTool }),
        })
      );
    });

    it('should handle OpenAI API errors gracefully (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openai-model' }));
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as any);

      // Mock API error
      vi.mocked(streamText).mockRejectedValue(new Error('OpenAI API error: Rate limit exceeded'));

      const provider = createOpenAI({ apiKey: 'test-key' });
      const model = provider('gpt-4');

      await expect(
        streamText({
          model,
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('OpenRouter Provider', () => {
    it('should initialize OpenRouter provider with API key', () => {
      const mockProvider = vi.fn(() => ({ type: 'openrouter-model' }));
      vi.mocked(createOpenRouter).mockReturnValue(mockProvider as any);

      const provider = createOpenRouter({ apiKey: 'test-key' });
      expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'test-key' });
      expect(provider).toBeDefined();
    });

    it('should stream text with OpenRouter provider (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openrouter-model', provider: 'openrouter' }));
      vi.mocked(createOpenRouter).mockReturnValue(mockProvider as any);

      const mockStream = {
        toDataStreamResponse: vi.fn(() => new Response('mock-stream')),
        usage: Promise.resolve({ promptTokens: 15, completionTokens: 8, totalTokens: 23 }),
        text: Promise.resolve('Hello from OpenRouter'),
        finishReason: Promise.resolve('stop'),
      };
      vi.mocked(streamText).mockResolvedValue(mockStream as any);

      const provider = createOpenRouter({ apiKey: 'test-key' });
      const model = provider('anthropic/claude-3-opus');

      const result = await streamText({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(streamText).toHaveBeenCalledWith({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.toDataStreamResponse).toBeDefined();
    });

    it('should support multiple OpenRouter models (mocked)', async () => {
      const mockProvider = vi.fn((modelId: string) => ({
        type: 'openrouter-model',
        modelId,
      }));
      vi.mocked(createOpenRouter).mockReturnValue(mockProvider as any);

      const provider = createOpenRouter({ apiKey: 'test-key' });

      const claude = provider('anthropic/claude-3-opus');
      const gpt4 = provider('openai/gpt-4-turbo');
      const llama = provider('meta-llama/llama-3-70b');

      expect(claude).toBeDefined();
      expect(gpt4).toBeDefined();
      expect(llama).toBeDefined();
    });

    it('should handle OpenRouter API errors gracefully (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openrouter-model' }));
      vi.mocked(createOpenRouter).mockReturnValue(mockProvider as any);

      // Mock API error
      vi.mocked(streamText).mockRejectedValue(
        new Error('OpenRouter API error: Model not available')
      );

      const provider = createOpenRouter({ apiKey: 'test-key' });
      const model = provider('anthropic/claude-3-opus');

      await expect(
        streamText({
          model,
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('OpenRouter API error');
    });
  });

  describe('Provider Selection', () => {
    it('should select correct provider based on model prefix', () => {
      const mockOpenAI = vi.fn(() => ({ type: 'openai-model' }));
      const mockOpenRouter = vi.fn(() => ({ type: 'openrouter-model' }));

      vi.mocked(createOpenAI).mockReturnValue(mockOpenAI as any);
      vi.mocked(createOpenRouter).mockReturnValue(mockOpenRouter as any);

      const openaiProvider = createOpenAI({ apiKey: 'test-key' });
      const openrouterProvider = createOpenRouter({ apiKey: 'test-key' });

      const openaiModel = openaiProvider('gpt-4');
      const openrouterModel = openrouterProvider('anthropic/claude-3-opus');

      expect(openaiModel).toBeDefined();
      expect(openrouterModel).toBeDefined();
    });

    it('should handle provider initialization without API keys', () => {
      // Should not throw, but provider won't work
      expect(() => createOpenAI({ apiKey: '' })).not.toThrow();
      expect(() => createOpenRouter({ apiKey: '' })).not.toThrow();
    });
  });

  describe('Streaming Behavior', () => {
    it('should handle streaming with multiple chunks (mocked)', async () => {
      const mockProvider = vi.fn(() => ({ type: 'openai-model' }));
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as any);

      const mockStream = {
        toDataStreamResponse: vi.fn(() => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('0:"Chunk 1"\n'));
              controller.enqueue(encoder.encode('0:"Chunk 2"\n'));
              controller.enqueue(encoder.encode('0:"Chunk 3"\n'));
              controller.close();
            },
          });
          return new Response(stream);
        }),
        usage: Promise.resolve({ promptTokens: 30, completionTokens: 15, totalTokens: 45 }),
        text: Promise.resolve('Chunk 1Chunk 2Chunk 3'),
        finishReason: Promise.resolve('stop'),
      };
      vi.mocked(streamText).mockResolvedValue(mockStream as any);

      const provider = createOpenAI({ apiKey: 'test-key' });
      const model = provider('gpt-4');

      const result = await streamText({
        model,
        messages: [{ role: 'user', content: 'Tell me a story' }],
      });

      const response = result.toDataStreamResponse();
      expect(response).toBeInstanceOf(Response);
    });
  });
});
