/**
 * Tests for OBI Expert tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OBIExpertTool } from '../obi-expert';
import type { OBIExpertContextVariables } from '../obi-expert';

describe('OBIExpertTool', () => {
  let contextVariables: OBIExpertContextVariables;

  beforeEach(() => {
    contextVariables = {
      sanityUrl: 'https://api.sanity.io/v1/data/query/production',
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(OBIExpertTool.toolName).toBe('obi-expert');
    });

    it('should have correct frontend name', () => {
      expect(OBIExpertTool.toolNameFrontend).toBe('OBI Expert');
    });

    it('should have utterances', () => {
      expect(OBIExpertTool.utterances).toBeInstanceOf(Array);
      expect(OBIExpertTool.utterances.length).toBeGreaterThan(0);
    });

    it('should have tool description', () => {
      expect(OBIExpertTool.toolDescription).toBeTruthy();
      expect(typeof OBIExpertTool.toolDescription).toBe('string');
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with all fields', () => {
      const tool = new OBIExpertTool(contextVariables);
      const input = {
        document_type: 'news' as const,
        page: 1,
        page_size: 5,
        sort: 'newest' as const,
        query: 'simulation',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with defaults', () => {
      const tool = new OBIExpertTool(contextVariables);
      const input = {
        document_type: 'glossaryItem' as const,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.page_size).toBe(5);
        expect(result.data.sort).toBe('newest');
      }
    });

    it('should accept all valid document types', () => {
      const tool = new OBIExpertTool(contextVariables);
      const documentTypes = [
        'documentationProduct',
        'futureFeaturesItem',
        'glossaryItem',
        'news',
        'pages',
        'planV2',
        'publicProjects',
        'tutorial',
      ];

      for (const docType of documentTypes) {
        const result = tool.inputSchema.safeParse({
          document_type: docType,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid document type', () => {
      const tool = new OBIExpertTool(contextVariables);
      const input = {
        document_type: 'invalid_type',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject page_size out of range', () => {
      const tool = new OBIExpertTool(contextVariables);
      const input = {
        document_type: 'news' as const,
        page_size: 15, // exceeds max of 10
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid query pattern', () => {
      const tool = new OBIExpertTool(contextVariables);
      const input = {
        document_type: 'news' as const,
        query: 'invalid query with spaces',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept valid query pattern', () => {
      const tool = new OBIExpertTool(contextVariables);
      const input = {
        document_type: 'news' as const,
        query: 'simulation-test_123',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should successfully query Sanity API', async () => {
      // Mock fetch - Sanity returns data with field names as specified in GROQ projection
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: [
              {
                _type: 'glossaryItem',
                id: 'glossary-1',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                name: 'Neuron',
                description: 'A nerve cell',
                definition: [
                  {
                    _type: 'block',
                    children: [{ text: 'A neuron is a nerve cell.' }],
                  },
                ],
              },
            ],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: 1 }),
        } as Response);

      const tool = new OBIExpertTool(contextVariables);
      const result = await tool.execute({
        document_type: 'glossaryItem',
        page: 1,
        page_size: 5,
        sort: 'newest',
        query: 'neuron',
      });

      expect(result.results).toHaveLength(1);
      expect(result.total_items).toBe(1);
      expect(result.results[0]?.id).toBe('glossary-1');
      expect(result.results[0]?.name).toBe('Neuron');
      expect(result.results[0]?.definition).toBe('A neuron is a nerve cell.');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const tool = new OBIExpertTool(contextVariables);

      await expect(
        tool.execute({
          document_type: 'news',
          page: 1,
          page_size: 5,
          sort: 'newest',
        })
      ).rejects.toThrow('Sanity API returned 500');
    });
  });

  describe('isOnline', () => {
    it('should return true', async () => {
      const result = await OBIExpertTool.isOnline(contextVariables);
      expect(result).toBe(true);
    });
  });
});
