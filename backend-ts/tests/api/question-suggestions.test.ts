/**
 * Unit Tests for Question Suggestions API
 *
 * Tests for the question suggestions endpoint that generates suggested user actions
 * based on conversation history (in-chat) or page context (out-of-chat).
 *
 * Requirements tested:
 * - 13.3: Question suggestions testing
 * - Validates: Requirements 13.3
 *
 * This test suite covers:
 * 1. In-chat suggestions with message history
 * 2. Out-of-chat suggestions with page context
 * 3. Rate limiting enforcement
 * 4. Authentication validation
 * 5. Error handling scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/qa/question_suggestions/route';

// ============================================================================
// Mocks
// ============================================================================

// Mock settings
vi.mock('@/lib/config/settings', () => ({
  getSettings: vi.fn(() => ({
    llm: {
      openaiToken: 'test-openai-token',
      openaiBaseUrl: 'https://api.openai.com/v1',
      suggestionModel: 'gpt-4o-mini',
    },
    rateLimiter: {
      limitSuggestionsInside: 10,
      limitSuggestionsOutside: 5,
      expirySuggestions: 3600,
    },
    tools: {
      entitycore: {
        url: 'https://entitycore.example.com',
      },
    },
  })),
}));

// Mock authentication
vi.mock('@/lib/middleware/auth', () => ({
  validateAuth: vi.fn(),
}));

// Mock rate limiting
vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

// Mock Prisma client
vi.mock('@/lib/db/client', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
    },
  },
}));

// Mock Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

// Mock OpenAI provider
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn((model: string) => ({ model }))),
}));

// Import mocked modules
import { validateAuth } from '@/lib/middleware/auth';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { prisma } from '@/lib/db/client';
import { generateObject } from 'ai';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock request with authentication
 */
function createAuthenticatedRequest(body: any, authToken = 'valid-token'): NextRequest {
  return new NextRequest('http://localhost/api/qa/question_suggestions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Mock user info for authentication
 */
const mockUserInfo = {
  sub: 'user-123',
  email: 'test@example.com',
  groups: ['vlab-1', 'project-1'],
};

/**
 * Mock rate limit result (not limited)
 */
const mockRateLimitOk = {
  limited: false,
  headers: {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': String(Date.now() + 3600000),
  },
};

/**
 * Mock rate limit result (limited)
 */
const mockRateLimitExceeded = {
  limited: true,
  headers: {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(Date.now() + 3600000),
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('Question Suggestions API - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject requests without authentication', async () => {
    vi.mocked(validateAuth).mockResolvedValue(null);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should accept requests with valid authentication', async () => {
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Show me brain regions' },
          { question: 'Find papers about neurons' },
          { question: 'Analyze morphology data' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(validateAuth).toHaveBeenCalledWith(request);
  });
});

describe('Question Suggestions API - In-Chat Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
  });

  it('should generate suggestions based on message history', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        threadId: '123e4567-e89b-12d3-a456-426614174000',
        entity: 'USER',
        content: JSON.stringify({ content: 'Tell me about the hippocampus' }),
        creationDate: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        threadId: '123e4567-e89b-12d3-a456-426614174000',
        entity: 'AI_MESSAGE',
        content: JSON.stringify({
          content: 'The hippocampus is a brain region involved in memory...',
        }),
        creationDate: new Date('2024-01-01T10:00:05Z'),
      },
    ];

    vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as any);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Show me cell morphologies in the hippocampus' },
          { question: 'Find papers about hippocampal memory formation' },
          { question: 'Analyze circuit metrics for hippocampal neurons' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestions).toHaveLength(3);
    expect(data.suggestions[0]).toHaveProperty('question');
    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: {
        threadId: '123e4567-e89b-12d3-a456-426614174000',
        entity: {
          in: ['USER', 'AI_MESSAGE'],
        },
      },
      orderBy: {
        creationDate: 'desc',
      },
      take: 4,
    });
  });

  it('should handle threads with no messages', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Show me available brain regions' },
          { question: 'Find recent neuroscience papers' },
          { question: 'Explore cell morphology data' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestions).toHaveLength(3);
  });

  it('should limit message history to last 4 messages', async () => {
    const mockMessages = Array.from({ length: 10 }, (_, i) => ({
      id: `msg-${i}`,
      threadId: '123e4567-e89b-12d3-a456-426614174000',
      entity: i % 2 === 0 ? 'USER' : 'AI_MESSAGE',
      content: JSON.stringify({ content: `Message ${i}` }),
      creationDate: new Date(`2024-01-01T10:00:${String(i).padStart(2, '0')}Z`),
    }));

    vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages.slice(0, 4) as any);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    await POST(request);

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 4,
      })
    );
  });

  it('should reverse messages to chronological order', async () => {
    const mockMessages = [
      {
        id: 'msg-2',
        entity: 'AI_MESSAGE',
        content: JSON.stringify({ content: 'Response' }),
        creationDate: new Date('2024-01-01T10:00:05Z'),
      },
      {
        id: 'msg-1',
        entity: 'USER',
        content: JSON.stringify({ content: 'Question' }),
        creationDate: new Date('2024-01-01T10:00:00Z'),
      },
    ];

    vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as any);

    let capturedMessages: any[] = [];
    vi.mocked(generateObject).mockImplementation(async (params: any) => {
      capturedMessages = params.messages;
      return {
        object: {
          suggestions: [
            { question: 'Suggestion 1' },
            { question: 'Suggestion 2' },
            { question: 'Suggestion 3' },
          ],
        },
      } as any;
    });

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    await POST(request);

    // First message should be system prompt, then user messages in chronological order
    expect(capturedMessages[0].role).toBe('system');
    expect(capturedMessages[1].role).toBe('user');
    expect(capturedMessages[1].content).toContain('Question');
    expect(capturedMessages[2].role).toBe('assistant');
    expect(capturedMessages[2].content).toContain('Response');
  });
});

describe('Question Suggestions API - Out-of-Chat Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
  });

  it('should generate suggestions based on page context', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Show me brain regions in this area' },
          { question: 'Find papers about this topic' },
          { question: 'Analyze related morphologies' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/brain-region/list',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestions).toHaveLength(3);
    expect(data.suggestions[0]).toHaveProperty('question');
  });

  it('should analyze page context from frontend URL', async () => {
    let capturedMessages: any[] = [];
    vi.mocked(generateObject).mockImplementation(async (params: any) => {
      capturedMessages = params.messages;
      return {
        object: {
          suggestions: [
            { question: 'Suggestion 1' },
            { question: 'Suggestion 2' },
            { question: 'Suggestion 3' },
          ],
        },
      } as any;
    });

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/brain-region/123e4567-e89b-12d3-a456-426614174002',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await POST(request);

    // Should include page context in user message
    expect(capturedMessages.length).toBeGreaterThan(1);
    expect(capturedMessages[1].role).toBe('user');
    expect(capturedMessages[1].content).toContain('page context');
    expect(capturedMessages[1].content).toContain('brain-region');
  });

  it('should handle URLs without specific entity', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Explore available data' },
          { question: 'Find relevant papers' },
          { question: 'Show me brain regions' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/overview',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestions).toHaveLength(3);
  });

  it('should handle invalid frontend URLs gracefully', async () => {
    // Invalid URLs that don't start with app/virtual-lab/ will be handled
    // by falling back to out-of-chat suggestions without page context
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Explore available data' },
          { question: 'Find relevant papers' },
          { question: 'Show me brain regions' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl: 'https://example.com/invalid/path',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed but without page context
    expect(response.status).toBe(200);
    expect(data.suggestions).toHaveLength(3);
  });

  it('should resolve brain region names from IDs', async () => {
    // Mock fetch for brain region resolution
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Hippocampus' }),
    });

    let capturedMessages: any[] = [];
    vi.mocked(generateObject).mockImplementation(async (params: any) => {
      capturedMessages = params.messages;
      return {
        object: {
          suggestions: [
            { question: 'Suggestion 1' },
            { question: 'Suggestion 2' },
            { question: 'Suggestion 3' },
          ],
        },
      } as any;
    });

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/brain-region/list?br_id=123e4567-e89b-12d3-a456-426614174002',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await POST(request);

    // Should include brain region name in context
    expect(capturedMessages.length).toBeGreaterThan(1);
    expect(capturedMessages[1].content).toContain('Hippocampus');
  });

  it('should handle brain region resolution failures gracefully', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/brain-region/list?br_id=123e4567-e89b-12d3-a456-426614174002',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);

    // Should still succeed even if brain region resolution fails
    expect(response.status).toBe(200);
  });
});

describe('Question Suggestions API - Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
  });

  it('should enforce rate limits for in-chat suggestions', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitExceeded);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should use higher rate limit for inside virtual lab', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/overview',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await POST(request);

    expect(checkRateLimit).toHaveBeenCalledWith(
      mockUserInfo.sub,
      'question_suggestions',
      10, // limitSuggestionsInside
      3600
    );
  });

  it('should use lower rate limit for outside virtual lab', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/overview',
      // No vlabId or projectId
    });

    await POST(request);

    expect(checkRateLimit).toHaveBeenCalledWith(
      mockUserInfo.sub,
      'question_suggestions',
      5, // limitSuggestionsOutside
      3600
    );
  });

  it('should include rate limit headers in successful responses', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl:
        'https://example.com/app/virtual-lab/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/overview',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });
});

describe('Question Suggestions API - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
  });

  it('should validate request body schema', async () => {
    const request = createAuthenticatedRequest({
      threadId: 'invalid-uuid', // Invalid UUID
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation Error');
  });

  it('should accept valid UUID for threadId', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should validate frontendUrl is a valid URL', async () => {
    const request = createAuthenticatedRequest({
      frontendUrl: 'not-a-valid-url',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation Error');
  });

  it('should accept optional vlabId and projectId', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      frontendUrl: 'https://example.com/app/virtual-lab/vlab-123/project-456/overview',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});

describe('Question Suggestions API - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(prisma.message.findMany).mockRejectedValue(new Error('Database error'));

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });

  it('should handle LLM generation errors gracefully', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockRejectedValue(new Error('LLM error'));

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });

  it('should handle malformed JSON in request body', async () => {
    const request = new NextRequest('http://localhost/api/qa/question_suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: 'invalid json{',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  it('should return 500 for unexpected errors', async () => {
    vi.mocked(validateAuth).mockRejectedValue(new Error('Unexpected error'));

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('Question Suggestions API - Response Format', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);
    vi.mocked(checkRateLimit).mockResolvedValue(mockRateLimitOk);
  });

  it('should return exactly 3 suggestions', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.suggestions).toHaveLength(3);
  });

  it('should return suggestions with question field', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Show me brain regions' },
          { question: 'Find papers about neurons' },
          { question: 'Analyze morphology data' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.suggestions[0]).toHaveProperty('question');
    expect(typeof data.suggestions[0].question).toBe('string');
    expect(data.suggestions[0].question.length).toBeGreaterThan(0);
  });

  it('should return JSON content type', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        suggestions: [
          { question: 'Suggestion 1' },
          { question: 'Suggestion 2' },
          { question: 'Suggestion 3' },
        ],
      },
    } as any);

    const request = createAuthenticatedRequest({
      threadId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const response = await POST(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
