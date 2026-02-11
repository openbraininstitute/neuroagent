/**
 * Tests for Person Tools
 *
 * Tests the PersonGetAllTool and PersonGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { PersonGetAllTool } from '../person-getall';
import { PersonGetOneTool } from '../person-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Person Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('PersonGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(PersonGetAllTool.toolName).toBe('entitycore-person-getall');
      expect(PersonGetAllTool.toolNameFrontend).toBe('Get All Persons');
      expect(PersonGetAllTool.toolDescription).toContain('persons');
      expect(PersonGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(PersonGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new PersonGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(PersonGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        pref_label: 'John Doe',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should support given_name filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        given_name: 'John',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support given_name__ilike filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        given_name__ilike: 'John%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support family_name filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        family_name: 'Doe',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support family_name__ilike filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        family_name__ilike: 'Doe%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        pref_label: 'John Doe',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label__ilike filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        pref_label__ilike: 'John%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label__in filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        pref_label__in: ['John Doe', 'Jane Smith'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support id filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate UUID format for id', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should support id__in filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support sub_id filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        sub_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support sub_id__in filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        sub_id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support created_by filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        created_by__pref_label: 'Admin User',
        created_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support updated_by filtering', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        updated_by__pref_label: 'Admin User',
        updated_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pagination', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        page: 2,
        page_size: 10,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support order_by', () => {
      const tool = new PersonGetAllTool(mockContextVariables);

      const input = {
        order_by: ['pref_label', '-creation_date'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new PersonGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('PersonGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(PersonGetOneTool.toolName).toBe('entitycore-person-getone');
      expect(PersonGetOneTool.toolNameFrontend).toBe('Get One Person');
      expect(PersonGetOneTool.toolDescription).toContain('specific person');
      expect(PersonGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(PersonGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new PersonGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(PersonGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new PersonGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        person_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new PersonGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        person_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require person_id', () => {
      const tool = new PersonGetOneTool(mockContextVariables);

      // Test missing person_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const tool = new PersonGetOneTool(mockContextVariables);

      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null person_id', () => {
      const tool = new PersonGetOneTool(mockContextVariables);

      const result = tool.inputSchema.safeParse({ person_id: null });
      expect(result.success).toBe(false);
    });

    it('should reject undefined person_id', () => {
      const tool = new PersonGetOneTool(mockContextVariables);

      const result = tool.inputSchema.safeParse({ person_id: undefined });
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new PersonGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(PersonGetAllTool.toolName).not.toBe(PersonGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(PersonGetAllTool.toolName).toMatch(/^entitycore-person-/);
      expect(PersonGetOneTool.toolName).toMatch(/^entitycore-person-/);
    });

    it('should have different frontend names', () => {
      expect(PersonGetAllTool.toolNameFrontend).not.toBe(PersonGetOneTool.toolNameFrontend);
    });
  });
});
