/**
 * Tests for Circuit Tools
 *
 * Tests the CircuitGetAllTool and CircuitGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { CircuitGetAllTool } from '../circuit-getall';
import { CircuitGetOneTool } from '../circuit-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Circuit Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('CircuitGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(CircuitGetAllTool.toolName).toBe('entitycore-circuit-getall');
      expect(CircuitGetAllTool.toolNameFrontend).toBe('Get All Circuits');
      expect(CircuitGetAllTool.toolDescription).toContain('circuits');
      expect(CircuitGetAllTool.toolDescription).toContain('obione-circuitmetrics-getone');
      expect(CircuitGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(CircuitGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(CircuitGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);

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
      const tool = new CircuitGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);

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
      const tool = new CircuitGetAllTool(mockContextVariables);

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
      const tool = new CircuitGetAllTool(mockContextVariables);

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

    it('should support circuit-specific filters', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);

      // Test circuit-specific parameters
      const validInput = {
        scale: 'microcircuit' as const,
        build_category: 'computational_model' as const,
        has_morphologies: true,
        has_point_neurons: false,
        number_neurons__gte: 100,
        number_neurons__lte: 1000,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should support atlas_id filter', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);

      const validInput = {
        atlas_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should support root_circuit_id filter', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);

      const validInput = {
        root_circuit_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new CircuitGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('CircuitGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(CircuitGetOneTool.toolName).toBe('entitycore-circuit-getone');
      expect(CircuitGetOneTool.toolNameFrontend).toBe('Get One Circuit');
      expect(CircuitGetOneTool.toolDescription).toContain('basic circuit metadata');
      expect(CircuitGetOneTool.toolDescription).toContain('obione-circuitmetrics-getone');
      expect(CircuitGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(CircuitGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new CircuitGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(CircuitGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new CircuitGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        circuit_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new CircuitGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        circuit_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require circuit_id', () => {
      const tool = new CircuitGetOneTool(mockContextVariables);

      // Test missing circuit_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new CircuitGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(CircuitGetAllTool.toolName).not.toBe(CircuitGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(CircuitGetAllTool.toolName).toMatch(/^entitycore-circuit-/);
      expect(CircuitGetOneTool.toolName).toMatch(/^entitycore-circuit-/);
    });
  });
});
