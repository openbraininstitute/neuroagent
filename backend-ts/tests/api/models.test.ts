/**
 * Tests for Models API Route
 *
 * Tests the /api/qa/models endpoint for listing available LLM models from OpenRouter.
 * Matches Python backend format.
 *
 * IMPORTANT: All fetch calls are mocked to prevent real API calls to OpenRouter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/qa/models/route';
import { NextRequest } from 'next/server';

// Mock authentication
vi.mock('@/lib/middleware/auth', () => ({
  validateAuth: vi.fn().mockResolvedValue({
    sub: 'test-user-id',
    email: 'test@example.com',
    groups: [],
  }),
  AuthenticationError: class AuthenticationError extends Error {},
}));

// Mock settings
vi.mock('@/lib/config/settings', () => ({
  getSettings: vi.fn().mockReturnValue({
    llm: {
      whitelistedModelIdsRegex: 'openai.*',
    },
  }),
}));

// Sample OpenRouter response for mocking
const mockOpenRouterResponse = {
  data: [
    {
      id: 'openai/gpt-4',
      name: 'GPT-4',
      created: 1678896000,
      description: 'GPT-4 model',
      architecture: {
        input_modalities: ['text'],
        output_modalities: ['text'],
        tokenizer: 'cl100k_base',
      },
      top_provider: {
        is_moderated: true,
      },
      pricing: {
        prompt: '0.00003',
        completion: '0.00006',
      },
      context_length: 8192,
      supported_parameters: ['temperature', 'max_tokens'],
    },
    {
      id: 'anthropic/claude-3',
      name: 'Claude 3',
      created: 1678896000,
      description: 'Claude 3 model',
      architecture: {
        input_modalities: ['text'],
        output_modalities: ['text'],
        tokenizer: 'claude',
      },
      top_provider: {
        is_moderated: true,
      },
      pricing: {
        prompt: '0.00003',
        completion: '0.00015',
      },
      context_length: 200000,
      supported_parameters: ['temperature', 'max_tokens'],
    },
  ],
};

describe('GET /api/qa/models', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // CRITICAL: Mock fetch globally to prevent real API calls to OpenRouter
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockOpenRouterResponse,
    });
  });

  it('should return list of models from OpenRouter', async () => {
    // Mock fetch to return sample OpenRouter response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'openai/gpt-4',
            name: 'GPT-4',
            created: 1678896000,
            description: 'GPT-4 model',
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
              tokenizer: 'cl100k_base',
            },
            top_provider: {
              is_moderated: true,
            },
            pricing: {
              prompt: '0.00003',
              completion: '0.00006',
            },
            context_length: 8192,
            supported_parameters: ['temperature', 'max_tokens'],
          },
          {
            id: 'anthropic/claude-3',
            name: 'Claude 3',
            created: 1678896000,
            description: 'Claude 3 model',
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
              tokenizer: 'claude',
            },
            top_provider: {
              is_moderated: true,
            },
            pricing: {
              prompt: '0.00003',
              completion: '0.00015',
            },
            context_length: 200000,
            supported_parameters: ['temperature', 'max_tokens'],
          },
        ],
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/qa/models', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('should filter models based on whitelist regex', async () => {
    // Mock fetch to return sample OpenRouter response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'openai/gpt-4',
            name: 'GPT-4',
            created: 1678896000,
            description: 'GPT-4 model',
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
              tokenizer: 'cl100k_base',
            },
            top_provider: {
              is_moderated: true,
            },
            pricing: {
              prompt: '0.00003',
              completion: '0.00006',
            },
            context_length: 8192,
            supported_parameters: ['temperature', 'max_tokens'],
          },
          {
            id: 'anthropic/claude-3',
            name: 'Claude 3',
            created: 1678896000,
            description: 'Claude 3 model',
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
              tokenizer: 'claude',
            },
            top_provider: {
              is_moderated: true,
            },
            pricing: {
              prompt: '0.00003',
              completion: '0.00015',
            },
            context_length: 200000,
            supported_parameters: ['temperature', 'max_tokens'],
          },
        ],
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/qa/models', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);

    // Should only include models matching 'openai.*' regex
    expect(data.length).toBe(1);
    expect(data[0]!.id).toBe('openai/gpt-4');
  });

  it('should require authentication', async () => {
    const { validateAuth, AuthenticationError } = await import('@/lib/middleware/auth');
    vi.mocked(validateAuth).mockRejectedValueOnce(new AuthenticationError('Unauthorized'));

    const request = new NextRequest('http://localhost:3000/api/qa/models');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should handle OpenRouter API errors', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const request = new NextRequest('http://localhost:3000/api/qa/models', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(502); // Bad Gateway
    expect(data).toHaveProperty('error');
  });

  it('should include all required model fields', async () => {
    // Mock fetch to return sample OpenRouter response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'openai/gpt-4',
            name: 'GPT-4',
            created: 1678896000,
            description: 'GPT-4 model',
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
              tokenizer: 'cl100k_base',
            },
            top_provider: {
              is_moderated: true,
            },
            pricing: {
              prompt: '0.00003',
              completion: '0.00006',
            },
            context_length: 8192,
            supported_parameters: ['temperature', 'max_tokens'],
          },
        ],
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/qa/models', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    if (data.length > 0) {
      const model = data[0];

      // Check required fields
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('created');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('architecture');
      expect(model).toHaveProperty('top_provider');
      expect(model).toHaveProperty('pricing');
      expect(model).toHaveProperty('context_length');
      expect(model).toHaveProperty('supported_parameters');

      // Check nested structures
      expect(model.architecture).toHaveProperty('input_modalities');
      expect(model.architecture).toHaveProperty('output_modalities');
      expect(model.architecture).toHaveProperty('tokenizer');
      expect(model.top_provider).toHaveProperty('is_moderated');
      expect(model.pricing).toHaveProperty('prompt');
      expect(model.pricing).toHaveProperty('completion');
    }
  });

  it('should match Python backend format', async () => {
    // Mock fetch to return sample OpenRouter response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'openai/gpt-4',
            name: 'GPT-4',
            created: 1678896000,
            description: 'GPT-4 model',
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
              tokenizer: 'cl100k_base',
            },
            top_provider: {
              is_moderated: true,
            },
            pricing: {
              prompt: '0.00003',
              completion: '0.00006',
            },
            context_length: 8192,
            supported_parameters: ['temperature', 'max_tokens'],
          },
        ],
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/qa/models', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    // Should be a plain array, not wrapped in an object
    expect(Array.isArray(data)).toBe(true);

    // Should match OpenRouterModelResponse schema from Python backend
    if (data.length > 0) {
      const model = data[0];
      expect(typeof model.id).toBe('string');
      expect(typeof model.name).toBe('string');
      expect(typeof model.created).toBe('number');
      expect(typeof model.description).toBe('string');
      expect(typeof model.context_length).toBe('number');
      expect(Array.isArray(model.supported_parameters)).toBe(true);
    }
  });
});
