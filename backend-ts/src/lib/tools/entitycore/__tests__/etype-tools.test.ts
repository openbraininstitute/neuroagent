/**
 * Tests for Etype Tools
 *
 * Tests the EtypeGetAllTool and EtypeGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { EtypeGetAllTool } from '../etype-getall';
import { EtypeGetOneTool } from '../etype-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Etype Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('EtypeGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(EtypeGetAllTool.toolName).toBe('entitycore-etype-getall');
      expect(EtypeGetAllTool.toolNameFrontend).toBe('Get All E-types');
      expect(EtypeGetAllTool.toolDescription).toContain('e-types');
      expect(EtypeGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(EtypeGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(EtypeGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(EtypeGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        pref_label: 'cADpyr',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['pref_label']);
    });

    it('should support pref_label filtering', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        pref_label: 'cADpyr',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label__in filtering', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        pref_label__in: ['cADpyr', 'bAC'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label__ilike filtering', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        pref_label__ilike: 'cAD%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support ID filtering', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support id__in filtering', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate UUID format for id', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        id: 'not-a-uuid',
      };
      const invalidResult = tool.inputSchema.safeParse(invalidInput);
      expect(invalidResult.success).toBe(false);
    });

    it('should support ilike_search', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        ilike_search: 'pyramidal',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support order_by', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);

      const input = {
        order_by: ['pref_label', '-creation_date'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new EtypeGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('EtypeGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(EtypeGetOneTool.toolName).toBe('entitycore-etype-getone');
      expect(EtypeGetOneTool.toolNameFrontend).toBe('Get One E-type');
      expect(EtypeGetOneTool.toolDescription).toContain('specific e-type');
      expect(EtypeGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(EtypeGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(EtypeGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new EtypeGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(EtypeGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new EtypeGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        etype_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new EtypeGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        etype_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require etype_id', () => {
      const tool = new EtypeGetOneTool(mockContextVariables);

      // Test missing etype_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new EtypeGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(EtypeGetAllTool.toolName).not.toBe(EtypeGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(EtypeGetAllTool.toolName).toMatch(/^entitycore-etype-/);
      expect(EtypeGetOneTool.toolName).toMatch(/^entitycore-etype-/);
    });
  });
});
