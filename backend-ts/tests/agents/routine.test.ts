/**
 * Tests for Agent Routine
 * 
 * These tests verify the core agent orchestration functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentsRoutine } from '@/lib/agents/routine';
import { Entity, Task, TokenType } from '@/types';
import type { Message, ToolCall } from '@prisma/client';

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
  CoreMessage: {},
  CoreTool: {},
  LanguageModelUsage: {},
}));

// Mock OpenAI provider - returns a function that creates model instances
const mockOpenAIProvider = vi.fn(() => ({ type: 'openai-model' }));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockOpenAIProvider),
}));

// Mock OpenRouter provider - returns a function that creates model instances
const mockOpenRouterProvider = vi.fn(() => ({ type: 'openrouter-model' }));
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => mockOpenRouterProvider),
}));

describe('AgentsRoutine', () => {
  let routine: AgentsRoutine;

  beforeEach(() => {
    routine = new AgentsRoutine('test-openai-key', undefined, 'test-openrouter-key');
  });

  describe('constructor', () => {
    it('should initialize with OpenAI key', () => {
      const r = new AgentsRoutine('test-key');
      expect(r).toBeInstanceOf(AgentsRoutine);
    });

    it('should initialize with OpenRouter key', () => {
      const r = new AgentsRoutine(undefined, undefined, 'test-key');
      expect(r).toBeInstanceOf(AgentsRoutine);
    });

    it('should initialize with both keys', () => {
      const r = new AgentsRoutine('openai-key', undefined, 'openrouter-key');
      expect(r).toBeInstanceOf(AgentsRoutine);
    });
  });

  describe('message conversion', () => {
    it('should convert user messages correctly', () => {
      const messages: (Message & { toolCalls: ToolCall[] })[] = [
        {
          id: '1',
          creationDate: new Date(),
          entity: 'USER' as any,
          content: JSON.stringify({ role: 'user', content: 'Hello' }),
          isComplete: true,
          threadId: 'thread-1',
          searchVector: null,
          toolCalls: [],
        },
      ];

      // Access private method via type assertion for testing
      const coreMessages = (routine as any).convertToCoreMessages(messages);

      expect(coreMessages).toHaveLength(1);
      expect(coreMessages[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should convert assistant messages correctly', () => {
      const messages: (Message & { toolCalls: ToolCall[] })[] = [
        {
          id: '1',
          creationDate: new Date(),
          entity: 'AI_MESSAGE' as any,
          content: JSON.stringify({ role: 'assistant', content: 'Hi there!' }),
          isComplete: true,
          threadId: 'thread-1',
          searchVector: null,
          toolCalls: [],
        },
      ];

      const coreMessages = (routine as any).convertToCoreMessages(messages);

      expect(coreMessages).toHaveLength(1);
      expect(coreMessages[0]).toEqual({
        role: 'assistant',
        content: 'Hi there!',
      });
    });

    it('should handle tool calls in assistant messages', () => {
      const messages: (Message & { toolCalls: ToolCall[] })[] = [
        {
          id: '1',
          creationDate: new Date(),
          entity: 'AI_MESSAGE' as any,
          content: JSON.stringify({ role: 'assistant', content: 'Let me search for that' }),
          isComplete: true,
          threadId: 'thread-1',
          searchVector: null,
          toolCalls: [
            {
              id: 'call-1',
              name: 'web_search',
              arguments: JSON.stringify({ query: 'test' }),
              validated: null,
              messageId: '1',
            },
          ],
        },
      ];

      const coreMessages = (routine as any).convertToCoreMessages(messages);

      expect(coreMessages).toHaveLength(1);
      expect(coreMessages[0].role).toBe('assistant');
      expect(Array.isArray(coreMessages[0].content)).toBe(true);
    });

    it('should convert tool result messages correctly', () => {
      const messages: (Message & { toolCalls: ToolCall[] })[] = [
        {
          id: '1',
          creationDate: new Date(),
          entity: 'TOOL' as any,
          content: JSON.stringify({
            tool_call_id: 'call-1',
            tool_name: 'web_search',
            content: 'Search results',
          }),
          isComplete: true,
          threadId: 'thread-1',
          searchVector: null,
          toolCalls: [],
        },
      ];

      const coreMessages = (routine as any).convertToCoreMessages(messages);

      expect(coreMessages).toHaveLength(1);
      expect(coreMessages[0].role).toBe('tool');
    });

    it('should skip malformed messages', () => {
      const messages: (Message & { toolCalls: ToolCall[] })[] = [
        {
          id: '1',
          creationDate: new Date(),
          entity: 'USER' as any,
          content: 'invalid json',
          isComplete: true,
          threadId: 'thread-1',
          searchVector: null,
          toolCalls: [],
        },
      ];

      const coreMessages = (routine as any).convertToCoreMessages(messages);

      expect(coreMessages).toHaveLength(0);
    });
  });

  describe('provider selection', () => {
    it('should select OpenAI provider for openai/ prefix', () => {
      const model = (routine as any).getProviderAndModel('openai/gpt-4');
      expect(model).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should select OpenRouter provider for openrouter/ prefix', () => {
      // OpenRouter client is initialized in constructor
      const model = (routine as any).getProviderAndModel('openrouter/anthropic/claude-3');
      expect(model).toBeDefined();
      expect(mockOpenRouterProvider).toHaveBeenCalledWith('anthropic/claude-3');
    });

    it('should default to OpenAI for no prefix', () => {
      const model = (routine as any).getProviderAndModel('gpt-4');
      expect(model).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should throw error if OpenAI not configured', () => {
      const r = new AgentsRoutine();
      expect(() => (r as any).getProviderAndModel('gpt-4')).toThrow(
        'OpenAI provider not configured'
      );
    });

    it('should throw error if OpenRouter not configured', () => {
      const r = new AgentsRoutine('openai-key');
      expect(() => (r as any).getProviderAndModel('openrouter/model')).toThrow(
        'OpenRouter provider not configured'
      );
    });
  });

  describe('token consumption records', () => {
    it('should create records for prompt and completion tokens', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
      };

      const records = (routine as any).createTokenConsumptionRecords(usage, 'gpt-4');

      expect(records).toHaveLength(2);
      expect(records[0]).toMatchObject({
        type: TokenType.INPUT_NONCACHED,
        task: Task.CHAT_COMPLETION,
        count: 100,
        model: 'gpt-4',
      });
      expect(records[1]).toMatchObject({
        type: TokenType.COMPLETION,
        task: Task.CHAT_COMPLETION,
        count: 50,
        model: 'gpt-4',
      });
    });

    it('should return empty array for undefined usage', () => {
      const records = (routine as any).createTokenConsumptionRecords(undefined, 'gpt-4');
      expect(records).toHaveLength(0);
    });

    it('should handle missing prompt tokens', () => {
      const usage = {
        completionTokens: 50,
      };

      const records = (routine as any).createTokenConsumptionRecords(usage, 'gpt-4');

      expect(records).toHaveLength(1);
      expect(records[0].type).toBe(TokenType.COMPLETION);
    });

    it('should handle missing completion tokens', () => {
      const usage = {
        promptTokens: 100,
      };

      const records = (routine as any).createTokenConsumptionRecords(usage, 'gpt-4');

      expect(records).toHaveLength(1);
      expect(records[0].type).toBe(TokenType.INPUT_NONCACHED);
    });

    it('should generate unique IDs for each record', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
      };

      const records = (routine as any).createTokenConsumptionRecords(usage, 'gpt-4');

      expect(records[0].id).toBeDefined();
      expect(records[1].id).toBeDefined();
      expect(records[0].id).not.toBe(records[1].id);
    });
  });
});
