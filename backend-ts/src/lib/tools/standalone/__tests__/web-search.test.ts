/**
 * Tests for Web Search tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchTool } from '../web-search';
import type { WebSearchContextVariables } from '../web-search';

describe('WebSearchTool', () => {
  let mockHttpClient: any;
  let contextVariables: WebSearchContextVariables;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    contextVariables = {
      httpClient: mockHttpClient,
      exaApiKey: 'test-exa-api-key',
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(WebSearchTool.toolName).toBe('web-search-tool');
    });

    it('should have correct frontend name', () => {
      expect(WebSearchTool.toolNameFrontend).toBe('Web Search');
    });

    it('should have utterances', () => {
      expect(WebSearchTool.utterances).toBeInstanceOf(Array);
      expect(WebSearchTool.utterances.length).toBeGreaterThan(0);
    });

    it('should have tool description', () => {
      expect(WebSearchTool.toolDescription).toBeTruthy();
      expect(typeof WebSearchTool.toolDescription).toBe('string');
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with all fields', () => {
      const tool = new WebSearchTool(contextVariables);
      const input = {
        query: 'artificial intelligence',
        num_results: 5,
        start_publish_date: '2020-01-01T00:00:00Z',
        end_publish_date: '2024-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with only required fields', () => {
      const tool = new WebSearchTool(contextVariables);
      const input = {
        query: 'machine learning',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.num_results).toBe(5); // default value
      }
    });

    it('should reject input with num_results out of range', () => {
      const tool = new WebSearchTool(contextVariables);
      const input = {
        query: 'AI',
        num_results: 20, // exceeds max of 10
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input with invalid date format', () => {
      const tool = new WebSearchTool(contextVariables);
      const input = {
        query: 'AI',
        start_publish_date: 'not-a-date',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input without query', () => {
      const tool = new WebSearchTool(contextVariables);
      const input = {
        num_results: 5,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should perform web search successfully', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Introduction to AI',
            url: 'https://example.com/ai-intro',
            publishedDate: '2023-05-10T00:00:00Z',
            author: 'Alice Johnson',
            id: 'result-1',
            image: 'https://example.com/ai-image.png',
            text: 'Artificial intelligence is...',
          },
          {
            title: 'Machine Learning Basics',
            url: 'https://example.com/ml-basics',
            publishedDate: null,
            author: null,
            id: 'result-2',
            image: null,
            text: 'Machine learning fundamentals...',
          },
        ],
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new WebSearchTool(contextVariables);
      const result = await tool.execute({
        query: 'artificial intelligence',
        num_results: 2,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.title).toBe('Introduction to AI');
      expect(result.results[0]?.url).toBe('https://example.com/ai-intro');
      expect(result.results[1]?.title).toBe('Machine Learning Basics');

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-exa-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include date filters when provided', async () => {
      const mockResponse = {
        results: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new WebSearchTool(contextVariables);
      await tool.execute({
        query: 'AI news',
        start_publish_date: '2023-01-01T00:00:00Z',
        end_publish_date: '2023-12-31T23:59:59Z',
        num_results: 5,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body);

      expect(body?.['startPublishedDate']).toBe('2023-01-01T00:00:00Z');
      expect(body?.['endPublishedDate']).toBe('2023-12-31T23:59:59Z');
    });

    it('should throw error on non-200 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      const tool = new WebSearchTool(contextVariables);

      await expect(
        tool.execute({
          query: 'test query',
          num_results: 5,
        })
      ).rejects.toThrow(
        'The Exa search endpoint returned a non 200 response code'
      );
    });

    it('should use auto search type', async () => {
      const mockResponse = { results: [] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new WebSearchTool(contextVariables);
      await tool.execute({
        query: 'test',
        num_results: 5,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.type).toBe('auto');
    });

    it('should not modify the query', async () => {
      const mockResponse = { results: [] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new WebSearchTool(contextVariables);
      await tool.execute({
        query: 'original query',
        num_results: 5,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.query).toBe('original query');
    });
  });

  describe('isOnline', () => {
    it('should return true', async () => {
      const result = await WebSearchTool.isOnline(contextVariables);
      expect(result).toBe(true);
    });
  });
});
