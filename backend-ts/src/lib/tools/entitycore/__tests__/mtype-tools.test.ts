/**
 * Tests for Mtype Tools
 *
 * Tests the MtypeGetAllTool and MtypeGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { MtypeGetAllTool } from '../mtype-getall';
import { MtypeGetOneTool } from '../mtype-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Mtype Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('MtypeGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(MtypeGetAllTool.toolName).toBe('entitycore-mtype-getall');
      expect(MtypeGetAllTool.toolNameFrontend).toBe('Get All M-types');
      expect(MtypeGetAllTool.toolDescription).toContain('m-types');
      expect(MtypeGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(MtypeGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(MtypeGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(MtypeGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        pref_label: 'L5_TPC:A',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['pref_label']);
    });

    it('should support pref_label filtering', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        pref_label: 'L5_TPC:A',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pref_label).toBe('L5_TPC:A');
      }
    });

    it('should support pref_label__in filtering', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        pref_label__in: ['L5_TPC:A', 'L6_TPC:A'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pref_label__in).toEqual(['L5_TPC:A', 'L6_TPC:A']);
      }
    });

    it('should support pref_label__ilike filtering', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        pref_label__ilike: 'L5%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pref_label__ilike).toBe('L5%');
      }
    });

    it('should support id filtering', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate UUID format for id', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        id: 'not-a-uuid',
      };

      const invalidResult = tool.inputSchema.safeParse(invalidInput);
      expect(invalidResult.success).toBe(false);
    });

    it('should support id__in filtering', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support ilike_search filtering', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        ilike_search: 'pyramidal',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ilike_search).toBe('pyramidal');
      }
    });

    it('should support custom order_by', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

      const input = {
        order_by: ['-creation_date', 'pref_label'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order_by).toEqual(['-creation_date', 'pref_label']);
      }
    });

    it('should support pagination', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);

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

    it('should convert to Vercel tool format', () => {
      const tool = new MtypeGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('MtypeGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(MtypeGetOneTool.toolName).toBe('entitycore-mtype-getone');
      expect(MtypeGetOneTool.toolNameFrontend).toBe('Get One M-type');
      expect(MtypeGetOneTool.toolDescription).toContain('specific m-type');
      expect(MtypeGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(MtypeGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(MtypeGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new MtypeGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(MtypeGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new MtypeGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        mtype_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new MtypeGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        mtype_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require mtype_id', () => {
      const tool = new MtypeGetOneTool(mockContextVariables);

      // Test missing mtype_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new MtypeGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(MtypeGetAllTool.toolName).not.toBe(MtypeGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(MtypeGetAllTool.toolName).toMatch(/^entitycore-mtype-/);
      expect(MtypeGetOneTool.toolName).toMatch(/^entitycore-mtype-/);
    });
  });
});
