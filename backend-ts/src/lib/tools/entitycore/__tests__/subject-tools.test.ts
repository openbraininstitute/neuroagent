/**
 * Tests for Subject Tools
 *
 * Tests the SubjectGetAllTool and SubjectGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SubjectGetAllTool } from '../subject-getall';
import { SubjectGetOneTool } from '../subject-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Subject Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SubjectGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SubjectGetAllTool.toolName).toBe('entitycore-subject-getall');
      expect(SubjectGetAllTool.toolNameFrontend).toBe('Get All Subjects');
      expect(SubjectGetAllTool.toolDescription).toContain('subjects');
      expect(SubjectGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SubjectGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SubjectGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SubjectGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        name: 'Test Subject',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['-creation_date']);
      expect(result.with_facets).toBe(false);
    });

    it('should support species filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        species_id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support strain filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        strain__name: 'C57BL/6J',
        strain__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support name filtering with ilike', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        name__ilike: 'mouse%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support age filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        age_value: '30',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support authorized filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        authorized_public: true,
        authorized_project_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support contribution filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        contribution__pref_label: 'Lab Name',
        contribution__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support creator filtering', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        created_by__given_name: 'John',
        created_by__family_name: 'Doe',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support search parameter', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);

      const input = {
        search: 'mouse subject',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SubjectGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SubjectGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SubjectGetOneTool.toolName).toBe('entitycore-subject-getone');
      expect(SubjectGetOneTool.toolNameFrontend).toBe('Get One Subject');
      expect(SubjectGetOneTool.toolDescription).toContain('specific subject');
      expect(SubjectGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SubjectGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SubjectGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SubjectGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        subject_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        subject_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require subject_id', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);

      // Test missing subject_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as subject_id', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);

      const invalidInput = {
        subject_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject null as subject_id', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);

      const invalidInput = {
        subject_id: null,
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SubjectGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SubjectGetAllTool.toolName).not.toBe(SubjectGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(SubjectGetAllTool.toolName).toMatch(/^entitycore-subject-/);
      expect(SubjectGetOneTool.toolName).toMatch(/^entitycore-subject-/);
    });

    it('should follow getall/getone naming convention', () => {
      expect(SubjectGetAllTool.toolName).toContain('getall');
      expect(SubjectGetOneTool.toolName).toContain('getone');
    });
  });
});
