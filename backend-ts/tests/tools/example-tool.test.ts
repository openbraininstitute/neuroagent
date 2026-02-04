/**
 * Unit tests for Example Tool
 *
 * Tests example tool execution with known inputs and error handling.
 * Validates: Requirements 13.4
 */

import { describe, it, expect } from 'vitest';
import { ExampleTool } from '@/lib/tools/example-tool';

describe('ExampleTool', () => {
  describe('Tool Metadata', () => {
    it('should have correct static metadata', () => {
      expect(ExampleTool.toolName).toBe('example_tool');
      expect(ExampleTool.toolNameFrontend).toBe('Example Tool');
      expect(ExampleTool.toolDescription).toBeTruthy();
      expect(ExampleTool.toolUtterances).toContain('example');
      expect(ExampleTool.toolHil).toBe(false);
    });

    it('should expose metadata through instance methods', () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      expect(tool.getName()).toBe('example_tool');
      expect(tool.getFrontendName()).toBe('Example Tool');
      expect(tool.getDescription()).toBeTruthy();
      expect(tool.getUtterances()).toContain('example');
      expect(tool.requiresHIL()).toBe(false);
    });
  });

  describe('Execution with Context Variables', () => {
    it('should execute with required context variables', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test query',
        maxResults: 3,
      });

      expect(result).toMatchObject({
        query: 'test query',
        resultCount: 3,
        results: expect.any(Array),
      });
    });

    it('should include API URL in results', async () => {
      const apiUrl = 'https://custom-api.example.com';
      const tool = new ExampleTool({ apiUrl });

      const result = await tool.execute({
        query: 'test',
        maxResults: 2,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]!.source).toBe(apiUrl);
    });

    it('should use API key when provided', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key-123',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 1,
        includeMetadata: true,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]!.metadata.authenticated).toBe(true);
    });

    it('should indicate unauthenticated when no API key', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 1,
        includeMetadata: true,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]!.metadata.authenticated).toBe(false);
    });
  });

  describe('Max Results Parameter', () => {
    it('should respect maxResults parameter', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 3,
      });

      const typedResult = result as any;
      expect(typedResult.results).toHaveLength(3);
    });

    it('should use default maxResults when not provided', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      // When maxResults is not provided, it needs to be parsed through the schema
      // to get the default value. In practice, the LLM would provide it or the
      // schema would parse it. For this test, we verify the schema default works.
      const parsedInput = tool.inputSchema.parse({
        query: 'test',
      });

      const result = await tool.execute(parsedInput);

      const typedResult = result as any;
      // Default is 10, but capped at 5
      expect(typedResult.resultCount).toBe(5);
      expect(typedResult.results).toBeInstanceOf(Array);
      expect(typedResult.results).toHaveLength(5);
    });

    it('should cap results at 5', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 100,
      });

      const typedResult = result as any;
      expect(typedResult.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Metadata Inclusion', () => {
    it('should include metadata when requested', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 1,
        includeMetadata: true,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]!.metadata).toBeDefined();
      expect(typedResult.results[0]!.metadata.timestamp).toBeDefined();
      expect(typedResult.results[0]!.metadata.relevance).toBeDefined();
    });

    it('should exclude metadata when not requested', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 1,
        includeMetadata: false,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]!.metadata).toBeUndefined();
    });

    it('should exclude metadata by default', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'test',
        maxResults: 1,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]!.metadata).toBeUndefined();
    });
  });

  describe('Result Structure', () => {
    it('should return properly structured results', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const result = await tool.execute({
        query: 'neuroscience',
        maxResults: 2,
      });

      const typedResult = result as any;
      expect(typedResult.results[0]).toMatchObject({
        id: expect.any(Number),
        title: expect.stringContaining('neuroscience'),
        content: expect.any(String),
        source: expect.any(String),
      });
    });

    it('should include query in response', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      const query = 'brain research';
      const result = await tool.execute({
        query,
        maxResults: 1,
      });

      const typedResult = result as any;
      expect(typedResult.query).toBe(query);
    });
  });

  describe('Input Validation', () => {
    it('should require query string', () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      expect(() =>
        tool.inputSchema.parse({
          maxResults: 5,
        })
      ).toThrow();
    });

    it('should validate maxResults is positive integer', () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      expect(() =>
        tool.inputSchema.parse({
          query: 'test',
          maxResults: -1,
        })
      ).toThrow();

      expect(() =>
        tool.inputSchema.parse({
          query: 'test',
          maxResults: 1.5,
        })
      ).toThrow();
    });

    it('should validate includeMetadata is boolean', () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });

      expect(() =>
        tool.inputSchema.parse({
          query: 'test',
          includeMetadata: 'yes',
        })
      ).toThrow();
    });
  });

  describe('Vercel AI SDK Integration', () => {
    it('should convert to Vercel tool format', () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toBeDefined();
      expect(vercelTool.description).toBe(tool.getDescription());
      expect(vercelTool.parameters).toBe(tool.inputSchema);
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should execute through Vercel tool wrapper', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });
      const vercelTool = tool.toVercelTool();

      const result = await vercelTool.execute!(
        {
          query: 'test',
          maxResults: 2,
        },
        {}
      );

      const typedResult = result as any;
      expect(typedResult.query).toBe('test');
      expect(typedResult.results).toHaveLength(2);
    });
  });

  describe('Health Check', () => {
    it('should always be online', async () => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
      });
      expect(await tool.isOnline()).toBe(true);
    });
  });
});
