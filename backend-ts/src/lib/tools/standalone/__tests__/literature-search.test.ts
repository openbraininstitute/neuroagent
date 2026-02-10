/**
 * Tests for Literature Search tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteratureSearchTool } from '../literature-search';
import type { LiteratureSearchContextVariables } from '../literature-search';

describe('LiteratureSearchTool', () => {
  let mockHttpClient: any;
  let contextVariables: LiteratureSearchContextVariables;

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
      expect(LiteratureSearchTool.toolName).toBe('literature-search-tool');
    });

    it('should have correct frontend name', () => {
      expect(LiteratureSearchTool.toolNameFrontend).toBe('Literature Search');
    });

    it('should have utterances', () => {
      expect(LiteratureSearchTool.utterances).toBeInstanceOf(Array);
      expect(LiteratureSearchTool.utterances.length).toBeGreaterThan(0);
    });

    it('should have tool description', () => {
      expect(LiteratureSearchTool.toolDescription).toBeTruthy();
      expect(typeof LiteratureSearchTool.toolDescription).toBe('string');
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with all fields', () => {
      const tool = new LiteratureSearchTool(contextVariables);
      const input = {
        query: 'neuroscience brain circuits',
        start_publish_date: '2020-01-01T00:00:00Z',
        end_publish_date: '2024-12-31T23:59:59Z',
        num_results: 5,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with only required fields', () => {
      const tool = new LiteratureSearchTool(contextVariables);
      const input = {
        query: 'neuroscience',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.num_results).toBe(5); // default value
      }
    });

    it('should reject input with num_results out of range', () => {
      const tool = new LiteratureSearchTool(contextVariables);
      const input = {
        query: 'neuroscience',
        num_results: 15, // exceeds max of 10
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input with invalid date format', () => {
      const tool = new LiteratureSearchTool(contextVariables);
      const input = {
        query: 'neuroscience',
        start_publish_date: 'invalid-date',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input without query', () => {
      const tool = new LiteratureSearchTool(contextVariables);
      const input = {
        num_results: 5,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should search for academic papers successfully', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Neural Circuits in the Brain',
            url: 'https://example.com/paper1',
            publishedDate: '2023-01-15T00:00:00Z',
            author: 'John Doe',
            id: 'paper-1',
            image: 'https://example.com/image1.png',
            text: 'This paper discusses neural circuits...',
          },
          {
            title: 'Brain Connectivity Studies',
            url: 'https://example.com/paper2',
            publishedDate: '2023-06-20T00:00:00Z',
            author: 'Jane Smith',
            id: 'paper-2',
            image: null,
            text: 'Research on brain connectivity...',
          },
        ],
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new LiteratureSearchTool(contextVariables);
      const result = await tool.execute({
        query: 'neural circuits',
        num_results: 2,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.title).toBe('Neural Circuits in the Brain');
      expect(result.results[0]?.url).toBe('https://example.com/paper1');
      expect(result.results[1]?.title).toBe('Brain Connectivity Studies');

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

      const tool = new LiteratureSearchTool(contextVariables);
      await tool.execute({
        query: 'neuroscience',
        start_publish_date: '2020-01-01T00:00:00Z',
        end_publish_date: '2024-12-31T23:59:59Z',
        num_results: 5,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body);

      expect(body?.['startPublishedDate']).toBe('2020-01-01T00:00:00Z');
      expect(body?.['endPublishedDate']).toBe('2024-12-31T23:59:59Z');
    });

    it('should throw error on non-200 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      const tool = new LiteratureSearchTool(contextVariables);

      await expect(
        tool.execute({
          query: 'neuroscience',
          num_results: 5,
        })
      ).rejects.toThrow(
        'The Exa search endpoint returned a non 200 response code'
      );
    });

    it('should include correct domains in search', async () => {
      const mockResponse = { results: [] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new LiteratureSearchTool(contextVariables);
      await tool.execute({
        query: 'neuroscience',
        num_results: 5,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.includeDomains).toContain('arxiv.org');
      expect(body.includeDomains).toContain('pubmed.ncbi.nlm.nih.gov');
      expect(body.includeDomains).toContain('nature.com');
    });

    it('should append search terms to query', async () => {
      const mockResponse = { results: [] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new LiteratureSearchTool(contextVariables);
      await tool.execute({
        query: 'neural circuits',
        num_results: 5,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.query).toBe('neural circuits academic paper research study');
    });
  });

  describe('isOnline', () => {
    it('should return true', async () => {
      const result = await LiteratureSearchTool.isOnline(contextVariables);
      expect(result).toBe(true);
    });
  });
});
