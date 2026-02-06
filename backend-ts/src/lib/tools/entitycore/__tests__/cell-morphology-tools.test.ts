/**
 * Tests for Cell Morphology Tools
 *
 * Tests the CellMorphologyGetAllTool and CellMorphologyGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { CellMorphologyGetAllTool } from '../cell-morphology-getall';
import { CellMorphologyGetOneTool } from '../cell-morphology-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Cell Morphology Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('CellMorphologyGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(CellMorphologyGetAllTool.toolName).toBe('entitycore-cellmorphology-getall');
      expect(CellMorphologyGetAllTool.toolNameFrontend).toBe('Get All Cell Morphologies');
      expect(CellMorphologyGetAllTool.toolDescription).toContain('cell morphologies');
      expect(CellMorphologyGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(CellMorphologyGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(CellMorphologyGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new CellMorphologyGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(CellMorphologyGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new CellMorphologyGetAllTool(mockContextVariables);

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
      const tool = new CellMorphologyGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new CellMorphologyGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new CellMorphologyGetAllTool(mockContextVariables);

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
      const tool = new CellMorphologyGetAllTool(mockContextVariables);

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
      const tool = new CellMorphologyGetAllTool(mockContextVariables);

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

    it('should convert to Vercel tool format', () => {
      const tool = new CellMorphologyGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('CellMorphologyGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(CellMorphologyGetOneTool.toolName).toBe('entitycore-cellmorphology-getone');
      expect(CellMorphologyGetOneTool.toolNameFrontend).toBe('Get One Cell Morphology');
      expect(CellMorphologyGetOneTool.toolDescription).toContain('specific cell morphology');
      expect(CellMorphologyGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(CellMorphologyGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(CellMorphologyGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new CellMorphologyGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(CellMorphologyGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new CellMorphologyGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        morphology_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new CellMorphologyGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        morphology_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require morphology_id', () => {
      const tool = new CellMorphologyGetOneTool(mockContextVariables);

      // Test missing morphology_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new CellMorphologyGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(CellMorphologyGetAllTool.toolName).not.toBe(CellMorphologyGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(CellMorphologyGetAllTool.toolName).toMatch(/^entitycore-cellmorphology-/);
      expect(CellMorphologyGetOneTool.toolName).toMatch(/^entitycore-cellmorphology-/);
    });
  });
});
