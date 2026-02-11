/**
 * Tests for Single Neuron Simulation Tools
 *
 * Tests the SingleNeuronSimulationGetAllTool and SingleNeuronSimulationGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SingleNeuronSimulationGetAllTool } from '../single-neuron-simulation-getall';
import { SingleNeuronSimulationGetOneTool } from '../single-neuron-simulation-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Single Neuron Simulation Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SingleNeuronSimulationGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SingleNeuronSimulationGetAllTool.toolName).toBe('entitycore-singleneuronsimulation-getall');
      expect(SingleNeuronSimulationGetAllTool.toolNameFrontend).toBe('Get All Single Neuron Simulations');
      expect(SingleNeuronSimulationGetAllTool.toolDescription).toContain('knowledge graph');
      expect(SingleNeuronSimulationGetAllTool.toolDescription).toContain('single-neuron-simulations');
      expect(SingleNeuronSimulationGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SingleNeuronSimulationGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SingleNeuronSimulationGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
        within_brain_region_direction: 'ascendants' as const,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);

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

    it('should validate within_brain_region_direction enum', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);

      // Test valid directions
      const validDirections = ['ascendants', 'descendants', 'ascendants_and_descendants'];

      validDirections.forEach((direction) => {
        const result = tool.inputSchema.safeParse({
          within_brain_region_direction: direction,
        });
        expect(result.success).toBe(true);
      });

      // Test invalid direction
      const invalidInput = {
        within_brain_region_direction: 'invalid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate UUID format for brain region ID', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);

      // Test invalid UUID
      const invalidInput = {
        within_brain_region_brain_region_id: 'not-a-uuid',
      };

      const result2 = tool.inputSchema.safeParse(invalidInput);
      expect(result2.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SingleNeuronSimulationGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should have isOnline static method', () => {
      expect(typeof SingleNeuronSimulationGetAllTool.isOnline).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have consistent naming pattern', () => {
      expect(SingleNeuronSimulationGetAllTool.toolName).toMatch(/^entitycore-singleneuronsimulation-/);
    });
  });

  describe('SingleNeuronSimulationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SingleNeuronSimulationGetOneTool.toolName).toBe('entitycore-singleneuronsimulation-getone');
      expect(SingleNeuronSimulationGetOneTool.toolNameFrontend).toBe('Get One Single Neuron Simulation');
      expect(SingleNeuronSimulationGetOneTool.toolDescription).toContain('knowledge graph');
      expect(SingleNeuronSimulationGetOneTool.toolDescription).toContain('single-neuron-simulation');
      expect(SingleNeuronSimulationGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SingleNeuronSimulationGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SingleNeuronSimulationGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SingleNeuronSimulationGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SingleNeuronSimulationGetOneTool(mockContextVariables);

      // Test valid input
      const validInput = {
        single_neuron_simulation_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate UUID format for single_neuron_simulation_id', () => {
      const tool = new SingleNeuronSimulationGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        single_neuron_simulation_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);

      // Test invalid UUID
      const invalidInput = {
        single_neuron_simulation_id: 'not-a-uuid',
      };

      const result2 = tool.inputSchema.safeParse(invalidInput);
      expect(result2.success).toBe(false);
    });

    it('should require single_neuron_simulation_id', () => {
      const tool = new SingleNeuronSimulationGetOneTool(mockContextVariables);

      // Test missing required field
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SingleNeuronSimulationGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should have isOnline static method', () => {
      expect(typeof SingleNeuronSimulationGetOneTool.isOnline).toBe('function');
    });
  });
});
