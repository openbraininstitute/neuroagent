/**
 * Tests for Read Paper tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadPaperTool } from '../read-paper';
import type { ReadPaperContextVariables } from '../read-paper';

describe('ReadPaperTool', () => {
  let mockHttpClient: any;
  let contextVariables: ReadPaperContextVariables;

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
      expect(ReadPaperTool.toolName).toBe('read-paper');
    });

    it('should have correct frontend name', () => {
      expect(ReadPaperTool.toolNameFrontend).toBe('Read Paper');
    });

    it('should have utterances', () => {
      expect(ReadPaperTool.utterances).toBeInstanceOf(Array);
      expect(ReadPaperTool.utterances.length).toBeGreaterThan(0);
    });

    it('should have tool description', () => {
      expect(ReadPaperTool.toolDescription).toBeTruthy();
      expect(typeof ReadPaperTool.toolDescription).toBe('string');
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with single URL', () => {
      const tool = new ReadPaperTool(contextVariables);
      const input = {
        urls: ['https://example.com/paper.pdf'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with multiple URLs', () => {
      const tool = new ReadPaperTool(contextVariables);
      const input = {
        urls: [
          'https://example.com/paper1.pdf',
          'https://example.com/paper2.pdf',
          'https://arxiv.org/abs/1234.5678',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject input with empty URLs array', () => {
      const tool = new ReadPaperTool(contextVariables);
      const input = {
        urls: [],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input with invalid URL', () => {
      const tool = new ReadPaperTool(contextVariables);
      const input = {
        urls: ['not-a-valid-url'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input without urls field', () => {
      const tool = new ReadPaperTool(contextVariables);
      const input = {};

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should extract content from URLs successfully', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Research Paper Title',
            url: 'https://example.com/paper.pdf',
            publishedDate: '2023-03-15T00:00:00Z',
            author: 'Dr. Jane Smith',
            id: 'content-1',
            image: 'https://example.com/paper-image.png',
            text: 'Full text content of the paper...',
          },
        ],
        statuses: [
          {
            id: 'content-1',
            status: 'success',
            error: null,
          },
        ],
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new ReadPaperTool(contextVariables);
      const result = await tool.execute({
        urls: ['https://example.com/paper.pdf'],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.title).toBe('Research Paper Title');
      expect(result.results[0]?.url).toBe('https://example.com/paper.pdf');
      expect(result.results[0]?.text).toContain('Full text content');
      expect(result.statuses).toHaveLength(1);
      expect(result.statuses[0]?.status).toBe('success');

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.exa.ai/contents',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-exa-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle multiple URLs', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Paper 1',
            url: 'https://example.com/paper1.pdf',
            publishedDate: null,
            author: null,
            id: 'content-1',
            image: null,
            text: 'Content 1',
          },
          {
            title: 'Paper 2',
            url: 'https://example.com/paper2.pdf',
            publishedDate: null,
            author: null,
            id: 'content-2',
            image: null,
            text: 'Content 2',
          },
        ],
        statuses: [
          { id: 'content-1', status: 'success', error: null },
          { id: 'content-2', status: 'success', error: null },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new ReadPaperTool(contextVariables);
      const result = await tool.execute({
        urls: [
          'https://example.com/paper1.pdf',
          'https://example.com/paper2.pdf',
        ],
      });

      expect(result.results).toHaveLength(2);
      expect(result.statuses).toHaveLength(2);
    });

    it('should handle errors in statuses', async () => {
      const mockResponse = {
        results: [],
        statuses: [
          {
            id: 'content-1',
            status: 'error',
            error: {
              tag: 'NOT_FOUND',
              httpStatusCode: 404,
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new ReadPaperTool(contextVariables);
      const result = await tool.execute({
        urls: ['https://example.com/nonexistent.pdf'],
      });

      expect(result.results).toHaveLength(0);
      expect(result.statuses).toHaveLength(1);
      expect(result.statuses[0]?.status).toBe('error');
      expect(result.statuses[0]?.error?.tag).toBe('NOT_FOUND');
    });

    it('should throw error on non-200 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      const tool = new ReadPaperTool(contextVariables);

      await expect(
        tool.execute({
          urls: ['https://example.com/paper.pdf'],
        })
      ).rejects.toThrow(
        'The Exa contents endpoint returned a non 200 response code'
      );
    });

    it('should request full text content', async () => {
      const mockResponse = { results: [], statuses: [] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tool = new ReadPaperTool(contextVariables);
      await tool.execute({
        urls: ['https://example.com/paper.pdf'],
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.contents.text).toBe(true);
      expect(body.contents.livecrawl).toBe('preferred');
      expect(body.contents.extras.imageLinks).toBe(3);
    });
  });

  describe('isOnline', () => {
    it('should return true', async () => {
      const result = await ReadPaperTool.isOnline(contextVariables);
      expect(result).toBe(true);
    });
  });
});
