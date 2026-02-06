/**
 * Tests for Strain Tools
 *
 * Tests the StrainGetAllTool and StrainGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { StrainGetAllTool } from '../strain-getall';
import { StrainGetOneTool } from '../strain-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Strain Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('StrainGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(StrainGetAllTool.toolName).toBe('entitycore-strain-getall');
      expect(StrainGetAllTool.toolNameFrontend).toBe('Get All Strains');
      expect(StrainGetAllTool.toolDescription).toContain('strains');
      expect(StrainGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(StrainGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(StrainGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new StrainGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(StrainGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        semantic_search: 'C57BL/6',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['name']);
    });

    it('should support semantic_search parameter', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        semantic_search: 'C57BL/6J',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.semantic_search).toBe('C57BL/6J');
      }
    });

    it('should exclude name-based parameters', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      // These fields should not be in the schema
      const inputWithExcludedFields = {
        name: 'C57BL/6',
        name__in: ['C57BL/6', 'BALB/c'],
        name__ilike: 'C57%',
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
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support multiple ID filtering', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
        update_date__gte: '2023-01-01T00:00:00Z',
        update_date__lte: '2023-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support creator filtering', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        created_by__id: '123e4567-e89b-12d3-a456-426614174000',
        created_by__pref_label: 'John Doe',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support updater filtering', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        updated_by__id: '123e4567-e89b-12d3-a456-426614174000',
        updated_by__pref_label: 'Jane Smith',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pagination', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

      const input = {
        page: 2,
        page_size: 10,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.page_size).toBe(10);
      }
    });

    it('should support order_by parameter', () => {
      const tool = new StrainGetAllTool(mockContextVariables);

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
      const tool = new StrainGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('StrainGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(StrainGetOneTool.toolName).toBe('entitycore-strain-getone');
      expect(StrainGetOneTool.toolNameFrontend).toBe('Get One Strain');
      expect(StrainGetOneTool.toolDescription).toContain('specific strain');
      expect(StrainGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(StrainGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(StrainGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new StrainGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(StrainGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new StrainGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        strain_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new StrainGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        strain_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require strain_id', () => {
      const tool = new StrainGetOneTool(mockContextVariables);

      // Test missing strain_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as strain_id', () => {
      const tool = new StrainGetOneTool(mockContextVariables);

      const invalidInput = {
        strain_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject null as strain_id', () => {
      const tool = new StrainGetOneTool(mockContextVariables);

      const invalidInput = {
        strain_id: null,
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new StrainGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(StrainGetAllTool.toolName).not.toBe(StrainGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(StrainGetAllTool.toolName).toMatch(/^entitycore-strain-/);
      expect(StrainGetOneTool.toolName).toMatch(/^entitycore-strain-/);
    });

    it('should follow getall/getone naming convention', () => {
      expect(StrainGetAllTool.toolName).toContain('getall');
      expect(StrainGetOneTool.toolName).toContain('getone');
    });
  });
});
