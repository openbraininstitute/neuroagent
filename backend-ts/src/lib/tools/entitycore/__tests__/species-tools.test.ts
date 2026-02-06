/**
 * Tests for Species Tools
 *
 * Tests the SpeciesGetAllTool and SpeciesGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SpeciesGetAllTool } from '../species-getall';
import { SpeciesGetOneTool } from '../species-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Species Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SpeciesGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SpeciesGetAllTool.toolName).toBe('entitycore-species-getall');
      expect(SpeciesGetAllTool.toolNameFrontend).toBe('Get All Species');
      expect(SpeciesGetAllTool.toolDescription).toContain('species');
      expect(SpeciesGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SpeciesGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SpeciesGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SpeciesGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        semantic_search: 'Mus Musculus',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['name']);
    });

    it('should support semantic_search parameter', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const input = {
        semantic_search: 'Rattus Norvegicus',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.semantic_search).toBe('Rattus Norvegicus');
      }
    });

    it('should exclude name-based parameters', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      // These fields should not be in the schema
      const inputWithExcludedFields = {
        name: 'Mus Musculus',
        name__in: ['Mus Musculus', 'Homo Sapiens'],
        name__ilike: 'Mus%',
      };

      const result = tool.inputSchema.safeParse(inputWithExcludedFields);
      // The parse should succeed but the excluded fields should not be present
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('name');
        expect(result.data).not.toHaveProperty('name__in');
        expect(result.data).not.toHaveProperty('name__ilike');
      }
    });

    it('should support ID filtering', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support multiple ID filtering', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate UUID format for ID filtering', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should support date range filtering', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support creator filtering', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const input = {
        created_by__pref_label: 'John Doe',
        created_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support order_by parameter', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);

      const input = {
        order_by: ['name', '-creation_date'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order_by).toEqual(['name', '-creation_date']);
      }
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SpeciesGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SpeciesGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SpeciesGetOneTool.toolName).toBe('entitycore-species-getone');
      expect(SpeciesGetOneTool.toolNameFrontend).toBe('Get One Species');
      expect(SpeciesGetOneTool.toolDescription).toContain('specific species');
      expect(SpeciesGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SpeciesGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SpeciesGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SpeciesGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SpeciesGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SpeciesGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        species_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SpeciesGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        species_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require species_id', () => {
      const tool = new SpeciesGetOneTool(mockContextVariables);

      // Test missing species_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty species_id', () => {
      const tool = new SpeciesGetOneTool(mockContextVariables);

      const invalidInput = {
        species_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SpeciesGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SpeciesGetAllTool.toolName).not.toBe(SpeciesGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(SpeciesGetAllTool.toolName).toMatch(/^entitycore-species-/);
      expect(SpeciesGetOneTool.toolName).toMatch(/^entitycore-species-/);
    });

    it('should have consistent frontend naming', () => {
      expect(SpeciesGetAllTool.toolNameFrontend).toContain('Species');
      expect(SpeciesGetOneTool.toolNameFrontend).toContain('Species');
    });
  });
});
