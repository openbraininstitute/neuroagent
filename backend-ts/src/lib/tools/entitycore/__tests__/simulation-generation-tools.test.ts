/**
 * Tests for SimulationGeneration Tools
 *
 * Tests the SimulationGenerationGetAllTool and SimulationGenerationGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SimulationGenerationGetAllTool } from '../simulation-generation-getall';
import { SimulationGenerationGetOneTool } from '../simulation-generation-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('SimulationGeneration Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SimulationGenerationGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationGenerationGetAllTool.toolName).toBe(
        'entitycore-simulationgeneration-getall'
      );
      expect(SimulationGenerationGetAllTool.toolNameFrontend).toBe(
        'Get All Simulation Generations'
      );
      expect(SimulationGenerationGetAllTool.toolDescription).toContain('simulation-generations');
      expect(SimulationGenerationGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationGenerationGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationGenerationGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

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
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);

      // Test page_size too small
      const invalidInput2 = {
        page_size: 0, // Min is 1
      };

      const result2 = tool.inputSchema.safeParse(invalidInput2);
      expect(result2.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

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
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

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

    it('should support status filtering', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        status: 'done',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date filtering', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2024-01-01T00:00:00Z',
        creation_date__lte: '2024-12-31T23:59:59Z',
        start_time: '2024-06-01T00:00:00Z',
        end_time: '2024-06-30T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support ID filtering', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support creator filtering', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        created_by__pref_label: 'John Doe',
        created_by__id: '123e4567-e89b-12d3-a456-426614174000',
        created_by__given_name: 'John',
        created_by__family_name: 'Doe',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support updater filtering', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        updated_by__pref_label: 'Jane Smith',
        updated_by__id: '123e4567-e89b-12d3-a456-426614174000',
        updated_by__given_name: 'Jane',
        updated_by__family_name: 'Smith',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support used and generated entity filtering', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        used__id: '123e4567-e89b-12d3-a456-426614174000',
        used__id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
        generated__id: '123e4567-e89b-12d3-a456-426614174002',
        generated__id__in: [
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support search and facets', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

      const input = {
        search: 'simulation test',
        with_facets: true,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pagination', () => {
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);

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
      const tool = new SimulationGenerationGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SimulationGenerationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationGenerationGetOneTool.toolName).toBe(
        'entitycore-simulationgeneration-getone'
      );
      expect(SimulationGenerationGetOneTool.toolNameFrontend).toBe(
        'Get One Simulation Generation'
      );
      expect(SimulationGenerationGetOneTool.toolDescription).toContain(
        'specific simulation-generation'
      );
      expect(SimulationGenerationGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationGenerationGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationGenerationGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        simulation_generation_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        simulation_generation_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require simulation_generation_id', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);

      // Test missing simulation_generation_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as simulation_generation_id', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);

      const invalidInput = {
        simulation_generation_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject null as simulation_generation_id', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);

      const invalidInput = {
        simulation_generation_id: null,
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SimulationGenerationGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SimulationGenerationGetAllTool.toolName).not.toBe(
        SimulationGenerationGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(SimulationGenerationGetAllTool.toolName).toMatch(
        /^entitycore-simulationgeneration-/
      );
      expect(SimulationGenerationGetOneTool.toolName).toMatch(
        /^entitycore-simulationgeneration-/
      );
    });

    it('should have consistent naming between getall and getone', () => {
      const getAllName = SimulationGenerationGetAllTool.toolName;
      const getOneName = SimulationGenerationGetOneTool.toolName;

      expect(getAllName.replace('-getall', '')).toBe(getOneName.replace('-getone', ''));
    });
  });
});
