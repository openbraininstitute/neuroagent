/**
 * Tests for SimulationResult Tools
 *
 * Tests the SimulationResultGetAllTool and SimulationResultGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SimulationResultGetAllTool } from '../simulation-result-getall';
import { SimulationResultGetOneTool } from '../simulation-result-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('SimulationResult Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SimulationResultGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationResultGetAllTool.toolName).toBe('entitycore-simulationresult-getall');
      expect(SimulationResultGetAllTool.toolNameFrontend).toBe('Get All Simulation Results');
      expect(SimulationResultGetAllTool.toolDescription).toContain('simulation-results');
      expect(SimulationResultGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationResultGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationResultGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

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
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum constraint', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

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
      const tool = new SimulationResultGetAllTool(mockContextVariables);

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

    it('should support name filtering', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        name: 'test-simulation',
        name__ilike: 'test%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2024-01-01T00:00:00Z',
        creation_date__lte: '2024-12-31T23:59:59Z',
        update_date__gte: '2024-01-01T00:00:00Z',
        update_date__lte: '2024-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support contribution filtering', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        contribution__pref_label: 'Test Contribution',
        contribution__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support creator filtering', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        created_by__given_name: 'John',
        created_by__family_name: 'Doe',
        created_by__sub_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support authorization filtering', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        authorized_public: true,
        authorized_project_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support search and ilike_search', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        search: 'simulation',
        ilike_search: 'test%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support facets option', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);

      const input = {
        with_facets: true,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.with_facets).toBe(true);
      }
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SimulationResultGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SimulationResultGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationResultGetOneTool.toolName).toBe('entitycore-simulationresult-getone');
      expect(SimulationResultGetOneTool.toolNameFrontend).toBe('Get One Simulation Result');
      expect(SimulationResultGetOneTool.toolDescription).toContain(
        'specific simulation-result'
      );
      expect(SimulationResultGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationResultGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationResultGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        simulation_result_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        simulation_result_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require simulation_result_id', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);

      // Test missing simulation_result_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as simulation_result_id', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);

      const invalidInput = {
        simulation_result_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject null as simulation_result_id', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);

      const invalidInput = {
        simulation_result_id: null,
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SimulationResultGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SimulationResultGetAllTool.toolName).not.toBe(
        SimulationResultGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(SimulationResultGetAllTool.toolName).toMatch(/^entitycore-simulationresult-/);
      expect(SimulationResultGetOneTool.toolName).toMatch(/^entitycore-simulationresult-/);
    });

    it('should follow getall/getone naming convention', () => {
      expect(SimulationResultGetAllTool.toolName).toContain('-getall');
      expect(SimulationResultGetOneTool.toolName).toContain('-getone');
    });
  });
});
