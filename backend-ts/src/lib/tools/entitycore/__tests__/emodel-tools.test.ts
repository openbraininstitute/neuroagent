/**
 * Tests for EModel Tools
 *
 * Tests the EModelGetAllTool and EModelGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { EModelGetAllTool } from '../emodel-getall';
import { EModelGetOneTool } from '../emodel-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('EModel Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('EModelGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(EModelGetAllTool.toolName).toBe('entitycore-emodel-getall');
      expect(EModelGetAllTool.toolNameFrontend).toBe('Get All E-Models');
      expect(EModelGetAllTool.toolDescription).toContain('e-models');
      expect(EModelGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(EModelGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new EModelGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(EModelGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new EModelGetAllTool(mockContextVariables);

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
      const tool = new EModelGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new EModelGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new EModelGetAllTool(mockContextVariables);

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
      const tool = new EModelGetAllTool(mockContextVariables);

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
      const tool = new EModelGetAllTool(mockContextVariables);

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
      const tool = new EModelGetAllTool(mockContextVariables);

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
      const tool = new EModelGetAllTool(mockContextVariables);

      const input = {
        etype__pref_label: 'cADpyr',
        mtype__pref_label: 'L5_TPC:A',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support score filtering', () => {
      const tool = new EModelGetAllTool(mockContextVariables);

      const input = {
        score__gte: 0.5,
        score__lte: 1.0,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new EModelGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('EModelGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(EModelGetOneTool.toolName).toBe('entitycore-emodel-getone');
      expect(EModelGetOneTool.toolNameFrontend).toBe('Get One E-Model');
      expect(EModelGetOneTool.toolDescription).toContain('specific e-model');
      expect(EModelGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(EModelGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new EModelGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(EModelGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new EModelGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        emodel_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new EModelGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        emodel_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require emodel_id', () => {
      const tool = new EModelGetOneTool(mockContextVariables);

      // Test missing emodel_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new EModelGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(EModelGetAllTool.toolName).not.toBe(EModelGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(EModelGetAllTool.toolName).toMatch(/^entitycore-emodel-/);
      expect(EModelGetOneTool.toolName).toMatch(/^entitycore-emodel-/);
    });
  });
});
