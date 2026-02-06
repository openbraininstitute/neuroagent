/**
 * Tests for MEModel Tools
 *
 * Tests the MEModelGetAllTool and MEModelGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { MEModelGetAllTool } from '../memodel-getall';
import { MEModelGetOneTool } from '../memodel-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('MEModel Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('MEModelGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(MEModelGetAllTool.toolName).toBe('entitycore-memodel-getall');
      expect(MEModelGetAllTool.toolNameFrontend).toBe('Get all ME-Models');
      expect(MEModelGetAllTool.toolDescription).toContain('ME-Model');
      expect(MEModelGetAllTool.toolDescription).toContain('simulated');
      expect(MEModelGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(MEModelGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(MEModelGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(MEModelGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        within_brain_region_direction: 'ascendants_and_descendants' as const,
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum constraint', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      // Test valid directions
      const validDirections = ['ascendants', 'descendants', 'ascendants_and_descendants'];
      validDirections.forEach((direction) => {
        const result = tool.inputSchema.safeParse({
          within_brain_region_direction: direction,
        });
        expect(result.success).toBe(true);
      });

      // Test invalid direction
      const invalidResult = tool.inputSchema.safeParse({
        within_brain_region_direction: 'invalid',
      });
      expect(invalidResult.success).toBe(false);
    });

    it('should validate UUID format for within_brain_region_brain_region_id', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const validResult = tool.inputSchema.safeParse(validInput);
      expect(validResult.success).toBe(true);

      // Test invalid UUID
      const invalidInput = {
        within_brain_region_brain_region_id: 'not-a-uuid',
      };
      const invalidResult = tool.inputSchema.safeParse(invalidInput);
      expect(invalidResult.success).toBe(false);
    });

    it('should exclude brain_region name-based parameters', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      // These fields should not be in the schema
      const inputWithExcludedFields = {
        brain_region__name: 'hippocampus',
        brain_region__name__in: ['hippocampus', 'cortex'],
        brain_region__name__ilike: 'hippo%',
      };

      const result = tool.inputSchema.safeParse(inputWithExcludedFields);
      // The parse should succeed but the excluded fields should not be present
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('brain_region__name');
        expect(result.data).not.toHaveProperty('brain_region__name__in');
        expect(result.data).not.toHaveProperty('brain_region__name__ilike');
      }
    });

    it('should support species filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        species_id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support e-type and m-type filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        etype__pref_label: 'cADpyr',
        mtype__pref_label: 'L5_TPC:A',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support morphology filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        morphology__name: 'C060114A5',
        morphology__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support emodel filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        emodel__name: 'cADpyr_L5TPC',
        emodel__score__gte: 0.5,
        emodel__score__lte: 1.0,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support subject species and strain filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        subject__species__name: 'Rattus norvegicus',
        subject__strain__name: 'Wistar',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support name filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        name: 'test-memodel',
        name__ilike: 'test%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new MEModelGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('MEModelGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(MEModelGetOneTool.toolName).toBe('entitycore-memodel-getone');
      expect(MEModelGetOneTool.toolNameFrontend).toBe('Get One ME-Model');
      expect(MEModelGetOneTool.toolDescription).toContain('ME-Model');
      expect(MEModelGetOneTool.toolDescription).toContain('UUID');
      expect(MEModelGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(MEModelGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(MEModelGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new MEModelGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(MEModelGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new MEModelGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        me_model_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new MEModelGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        me_model_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require me_model_id', () => {
      const tool = new MEModelGetOneTool(mockContextVariables);

      // Test missing me_model_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as me_model_id', () => {
      const tool = new MEModelGetOneTool(mockContextVariables);

      const invalidInput = {
        me_model_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new MEModelGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(MEModelGetAllTool.toolName).not.toBe(MEModelGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(MEModelGetAllTool.toolName).toMatch(/^entitycore-memodel-/);
      expect(MEModelGetOneTool.toolName).toMatch(/^entitycore-memodel-/);
    });

    it('should have different frontend names', () => {
      expect(MEModelGetAllTool.toolNameFrontend).not.toBe(
        MEModelGetOneTool.toolNameFrontend
      );
    });

    it('should have different descriptions', () => {
      expect(MEModelGetAllTool.toolDescription).not.toBe(
        MEModelGetOneTool.toolDescription
      );
    });
  });
});
