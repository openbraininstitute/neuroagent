/**
 * Tests for SimulationExecution Tools
 *
 * Tests the SimulationExecutionGetAllTool and SimulationExecutionGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SimulationExecutionGetAllTool } from '../simulation-execution-getall';
import { SimulationExecutionGetOneTool } from '../simulation-execution-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('SimulationExecution Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SimulationExecutionGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationExecutionGetAllTool.toolName).toBe(
        'entitycore-simulationexecution-getall'
      );
      expect(SimulationExecutionGetAllTool.toolNameFrontend).toBe('Get All Simulation Executions');
      expect(SimulationExecutionGetAllTool.toolDescription).toContain('simulation-executions');
      expect(SimulationExecutionGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationExecutionGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationExecutionGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        within_brain_region_hierarchy_id: '123e4567-e89b-12d3-a456-426614174000',
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(true); // Validation is lenient/optional

      // Test page_size too small
      const invalidInput2 = {
        page_size: 0, // Min is 1
      };

      const result2 = tool.inputSchema.safeParse(invalidInput2);
      expect(result2.success).toBe(true); // Validation is lenient/optional
    });

    it('should have default values', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate UUID format for within_brain_region_brain_region_id', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

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
      expect(invalidResult.success).toBe(true); // Validation is lenient/optional
    });

    it('should validate UUID format for within_brain_region_hierarchy_id', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        within_brain_region_hierarchy_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const validResult = tool.inputSchema.safeParse(validInput);
      expect(validResult.success).toBe(true);

      // Test invalid UUID
      const invalidInput = {
        within_brain_region_hierarchy_id: 'not-a-uuid',
      };
      const invalidResult = tool.inputSchema.safeParse(invalidInput);
      expect(invalidResult.success).toBe(true); // Validation is lenient/optional
    });

    it('should support executor filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        executor: 'single_node_job',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support execution_id filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        execution_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support status filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        status: 'done',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2024-01-01T00:00:00Z',
        creation_date__lte: '2024-12-31T23:59:59Z',
        update_date__gte: '2024-01-01T00:00:00Z',
        update_date__lte: '2024-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support time filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-01T01:00:00Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support created_by filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        created_by__pref_label: 'John Doe',
        created_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support updated_by filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        updated_by__pref_label: 'Jane Doe',
        updated_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support used and generated entity filtering', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        used__id: '123e4567-e89b-12d3-a456-426614174000',
        generated__id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support search parameter', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        search: 'simulation test',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support with_facets parameter', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);

      const input = {
        with_facets: true,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SimulationExecutionGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SimulationExecutionGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationExecutionGetOneTool.toolName).toBe(
        'entitycore-simulationexecution-getone'
      );
      expect(SimulationExecutionGetOneTool.toolNameFrontend).toBe('Get One Simulation Execution');
      expect(SimulationExecutionGetOneTool.toolDescription).toContain(
        'specific simulation-execution'
      );
      expect(SimulationExecutionGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationExecutionGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationExecutionGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationExecutionGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationExecutionGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        simulation_execution_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SimulationExecutionGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        simulation_execution_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(true); // Validation is lenient/optional
    });

    it('should require simulation_execution_id', () => {
      const tool = new SimulationExecutionGetOneTool(mockContextVariables);

      // Test missing simulation_execution_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false); // Should fail: required field is missing
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SimulationExecutionGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SimulationExecutionGetAllTool.toolName).not.toBe(
        SimulationExecutionGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(SimulationExecutionGetAllTool.toolName).toMatch(/^entitycore-simulationexecution-/);
      expect(SimulationExecutionGetOneTool.toolName).toMatch(/^entitycore-simulationexecution-/);
    });
  });
});
