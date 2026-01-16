/**
 * Provider Selection Integration Tests
 * 
 * These tests verify that the provider selection logic works correctly
 * with different model identifiers and configurations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentsRoutine } from '@/lib/agents/routine';

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

describe('Provider Selection Integration', () => {
  describe('with both providers configured', () => {
    let routine: AgentsRoutine;

    beforeEach(() => {
      routine = new AgentsRoutine('test-openai-key', undefined, 'test-openrouter-key');
      vi.clearAllMocks();
    });

    it('should select OpenAI for openai/ prefix', () => {
      const result = (routine as any).getProviderAndModel('openai/gpt-4');
      
      expect(result).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should select OpenAI for openai/ prefix with turbo model', () => {
      const result = (routine as any).getProviderAndModel('openai/gpt-4-turbo');
      
      expect(result).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4-turbo');
    });

    it('should select OpenRouter for openrouter/ prefix', () => {
      const result = (routine as any).getProviderAndModel('openrouter/anthropic/claude-3-opus');
      
      expect(result).toBeDefined();
      expect(mockOpenRouterProvider).toHaveBeenCalledWith('anthropic/claude-3-opus');
    });

    it('should select OpenRouter for openrouter/ prefix with nested path', () => {
      const result = (routine as any).getProviderAndModel('openrouter/google/gemini-pro');
      
      expect(result).toBeDefined();
      expect(mockOpenRouterProvider).toHaveBeenCalledWith('google/gemini-pro');
    });

    it('should default to OpenAI when no prefix is provided', () => {
      const result = (routine as any).getProviderAndModel('gpt-4');
      
      expect(result).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should default to OpenAI for legacy model names', () => {
      const result = (routine as any).getProviderAndModel('gpt-3.5-turbo');
      
      expect(result).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-3.5-turbo');
    });
  });

  describe('with only OpenAI configured', () => {
    let routine: AgentsRoutine;

    beforeEach(() => {
      routine = new AgentsRoutine('test-openai-key');
      vi.clearAllMocks();
    });

    it('should work with OpenAI models', () => {
      const result = (routine as any).getProviderAndModel('openai/gpt-4');
      expect(result).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should work with default (no prefix) models', () => {
      const result = (routine as any).getProviderAndModel('gpt-4');
      expect(result).toBeDefined();
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should throw error for OpenRouter models', () => {
      expect(() => {
        (routine as any).getProviderAndModel('openrouter/anthropic/claude-3');
      }).toThrow('OpenRouter provider not configured');
    });
  });

  describe('with only OpenRouter configured', () => {
    let routine: AgentsRoutine;

    beforeEach(() => {
      routine = new AgentsRoutine(undefined, undefined, 'test-openrouter-key');
      vi.clearAllMocks();
    });

    it('should work with OpenRouter models', () => {
      const result = (routine as any).getProviderAndModel('openrouter/anthropic/claude-3');
      expect(result).toBeDefined();
      expect(mockOpenRouterProvider).toHaveBeenCalledWith('anthropic/claude-3');
    });

    it('should throw error for OpenAI models with prefix', () => {
      expect(() => {
        (routine as any).getProviderAndModel('openai/gpt-4');
      }).toThrow('OpenAI provider not configured');
    });

    it('should throw error for default (no prefix) models', () => {
      expect(() => {
        (routine as any).getProviderAndModel('gpt-4');
      }).toThrow('OpenAI provider not configured');
    });
  });

  describe('with no providers configured', () => {
    let routine: AgentsRoutine;

    beforeEach(() => {
      routine = new AgentsRoutine();
    });

    it('should throw error for OpenAI models', () => {
      expect(() => {
        (routine as any).getProviderAndModel('openai/gpt-4');
      }).toThrow('OpenAI provider not configured');
    });

    it('should throw error for OpenRouter models', () => {
      expect(() => {
        (routine as any).getProviderAndModel('openrouter/anthropic/claude-3');
      }).toThrow('OpenRouter provider not configured');
    });

    it('should throw error for default models', () => {
      expect(() => {
        (routine as any).getProviderAndModel('gpt-4');
      }).toThrow('OpenAI provider not configured');
    });
  });

  describe('model identifier parsing', () => {
    let routine: AgentsRoutine;

    beforeEach(() => {
      routine = new AgentsRoutine('test-openai-key', undefined, 'test-openrouter-key');
      vi.clearAllMocks();
    });

    it('should correctly parse simple OpenAI model names', () => {
      (routine as any).getProviderAndModel('openai/gpt-4');
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4');
    });

    it('should correctly parse OpenAI model names with hyphens', () => {
      (routine as any).getProviderAndModel('openai/gpt-4-turbo-preview');
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4-turbo-preview');
    });

    it('should correctly parse OpenRouter nested paths', () => {
      (routine as any).getProviderAndModel('openrouter/anthropic/claude-3-opus-20240229');
      expect(mockOpenRouterProvider).toHaveBeenCalledWith('anthropic/claude-3-opus-20240229');
    });

    it('should correctly parse OpenRouter with multiple slashes', () => {
      (routine as any).getProviderAndModel('openrouter/meta-llama/llama-3-70b-instruct');
      expect(mockOpenRouterProvider).toHaveBeenCalledWith('meta-llama/llama-3-70b-instruct');
    });

    it('should preserve model name exactly when no prefix', () => {
      (routine as any).getProviderAndModel('gpt-4-0125-preview');
      expect(mockOpenAIProvider).toHaveBeenCalledWith('gpt-4-0125-preview');
    });
  });
});
