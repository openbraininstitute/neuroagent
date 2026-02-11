/**
 * Tests for Brain Atlas Tools
 *
 * Tests the BrainAtlasGetAllTool and BrainAtlasGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { BrainAtlasGetAllTool } from '../brain-atlas-getall';
import { BrainAtlasGetOneTool } from '../brain-atlas-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Brain Atlas Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('BrainAtlasGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(BrainAtlasGetAllTool.toolName).toBe('entitycore-brainatlas-getall');
      expect(BrainAtlasGetAllTool.toolNameFrontend).toBe('Get All Brain Atlases');
      expect(BrainAtlasGetAllTool.toolDescription).toContain('brain atlases');
      expect(BrainAtlasGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(BrainAtlasGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(BrainAtlasGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        page: 1,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default page_size of 5', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page_size).toBe(5);
    });

    it('should accept optional filter parameters', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);

      // Test with name filter
      const inputWithName = {
        name: 'Allen Mouse Brain Atlas',
      };
      const resultWithName = tool.inputSchema.safeParse(inputWithName);
      expect(resultWithName.success).toBe(true);

      // Test with species filter
      const inputWithSpecies = {
        species__name: 'Mus musculus',
      };
      const resultWithSpecies = tool.inputSchema.safeParse(inputWithSpecies);
      expect(resultWithSpecies.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new BrainAtlasGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should include correct utterances', () => {
      const utterances = BrainAtlasGetAllTool.toolUtterances;
      expect(utterances).toContain('Find brain atlases');
      expect(utterances).toContain('Show me available brain atlases');
      expect(utterances).toContain('What brain atlases are there?');
    });

    it('should have frontend description', () => {
      expect(BrainAtlasGetAllTool.toolDescriptionFrontend).toContain('brain atlases');
      expect(BrainAtlasGetAllTool.toolDescriptionFrontend).toContain('species');
    });
  });

  describe('BrainAtlasGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(BrainAtlasGetOneTool.toolName).toBe('entitycore-brainatlas-getone');
      expect(BrainAtlasGetOneTool.toolNameFrontend).toBe('Get One Brain Atlas');
      expect(BrainAtlasGetOneTool.toolDescription).toContain('specific brain atlas');
      expect(BrainAtlasGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(BrainAtlasGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new BrainAtlasGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(BrainAtlasGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new BrainAtlasGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        brain_atlas_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new BrainAtlasGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        brain_atlas_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require brain_atlas_id', () => {
      const tool = new BrainAtlasGetOneTool(mockContextVariables);

      // Test missing brain_atlas_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new BrainAtlasGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should include correct utterances', () => {
      const utterances = BrainAtlasGetOneTool.toolUtterances;
      expect(utterances).toContain('Get details for this brain atlas');
      expect(utterances).toContain('Show me information about this atlas');
      expect(utterances).toContain('What are the properties of this brain atlas?');
    });

    it('should have frontend description', () => {
      expect(BrainAtlasGetOneTool.toolDescriptionFrontend).toContain('brain atlas');
      expect(BrainAtlasGetOneTool.toolDescriptionFrontend).toContain('details');
    });

    it('should describe required input in schema', () => {
      const tool = new BrainAtlasGetOneTool(mockContextVariables);
      const schema = tool.inputSchema;

      // Check that the schema has a description for brain_atlas_id
      const parsed = schema.safeParse({
        brain_atlas_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(BrainAtlasGetAllTool.toolName).not.toBe(BrainAtlasGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(BrainAtlasGetAllTool.toolName).toMatch(/^entitycore-brainatlas-/);
      expect(BrainAtlasGetOneTool.toolName).toMatch(/^entitycore-brainatlas-/);
    });

    it('should follow entitycore naming convention', () => {
      expect(BrainAtlasGetAllTool.toolName).toContain('entitycore');
      expect(BrainAtlasGetOneTool.toolName).toContain('entitycore');
    });
  });

  describe('Tool Metadata Consistency', () => {
    it('should have matching tool name patterns', () => {
      const getAllName = BrainAtlasGetAllTool.toolName;
      const getOneName = BrainAtlasGetOneTool.toolName;

      // Both should start with the same prefix
      const prefix = 'entitycore-brainatlas-';
      expect(getAllName.startsWith(prefix)).toBe(true);
      expect(getOneName.startsWith(prefix)).toBe(true);

      // GetAll should end with 'getall'
      expect(getAllName.endsWith('getall')).toBe(true);

      // GetOne should end with 'getone'
      expect(getOneName.endsWith('getone')).toBe(true);
    });

    it('should have non-empty descriptions', () => {
      expect(BrainAtlasGetAllTool.toolDescription.length).toBeGreaterThan(0);
      expect(BrainAtlasGetOneTool.toolDescription.length).toBeGreaterThan(0);
      expect(BrainAtlasGetAllTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
      expect(BrainAtlasGetOneTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
    });

    it('should have at least one utterance each', () => {
      expect(BrainAtlasGetAllTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
      expect(BrainAtlasGetOneTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
    });
  });
});
