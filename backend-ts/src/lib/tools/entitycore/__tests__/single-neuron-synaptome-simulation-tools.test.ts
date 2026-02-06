/**
 * Tests for Single Neuron Synaptome Simulation Tools
 *
 * Tests the SingleNeuronSynaptomeSimulationGetAllTool and SingleNeuronSynaptomeSimulationGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SingleNeuronSynaptomeSimulationGetAllTool } from '../single-neuron-synaptome-simulation-getall';
import { SingleNeuronSynaptomeSimulationGetOneTool } from '../single-neuron-synaptome-simulation-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Single Neuron Synaptome Simulation Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SingleNeuronSynaptomeSimulationGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolName).toBe(
        'entitycore-singleneuronsynaptomesimulation-getall'
      );
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolNameFrontend).toBe(
        'Get All Single Neuron Synaptome Simulations'
      );
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolDescription).toContain(
        'single-neuron-synaptome-simulations'
      );
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SingleNeuronSynaptomeSimulationGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

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

    it('should support synaptome filtering', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const input = {
        synaptome__id: '123e4567-e89b-12d3-a456-426614174000',
        synaptome__name: 'Test Synaptome',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support me_model filtering', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const input = {
        me_model__brain_region__id: '123e4567-e89b-12d3-a456-426614174000',
        me_model__species__name: 'Mus musculus',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support morphology filtering', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const input = {
        morphology__brain_region__id: '123e4567-e89b-12d3-a456-426614174000',
        morphology__mtype__pref_label: 'L5_TPC:A',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support emodel filtering', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const input = {
        emodel__brain_region__id: '123e4567-e89b-12d3-a456-426614174000',
        emodel__etype__pref_label: 'cADpyr',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support name filtering', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const input = {
        name: 'Test Simulation',
        name__ilike: 'test%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pagination parameters', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeSimulationGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SingleNeuronSynaptomeSimulationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolName).toBe(
        'entitycore-singleneuronsynaptomesimulation-getone'
      );
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolNameFrontend).toBe(
        'Get One Single Neuron Synaptome Simulation'
      );
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolDescription).toContain(
        'specific single-neuron-synaptome-simulation'
      );
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SingleNeuronSynaptomeSimulationGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        single_neuron_synaptome_simulation_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        single_neuron_synaptome_simulation_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require single_neuron_synaptome_simulation_id', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);

      // Test missing single_neuron_synaptome_simulation_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as UUID', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);

      const invalidInput = {
        single_neuron_synaptome_simulation_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject malformed UUID', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);

      const invalidInput = {
        single_neuron_synaptome_simulation_id: '123e4567-e89b-12d3-a456',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SingleNeuronSynaptomeSimulationGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolName).not.toBe(
        SingleNeuronSynaptomeSimulationGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolName).toMatch(
        /^entitycore-singleneuronsynaptomesimulation-/
      );
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolName).toMatch(
        /^entitycore-singleneuronsynaptomesimulation-/
      );
    });

    it('should have descriptive frontend names', () => {
      expect(SingleNeuronSynaptomeSimulationGetAllTool.toolNameFrontend).toContain(
        'Single Neuron Synaptome Simulation'
      );
      expect(SingleNeuronSynaptomeSimulationGetOneTool.toolNameFrontend).toContain(
        'Single Neuron Synaptome Simulation'
      );
    });
  });
});
