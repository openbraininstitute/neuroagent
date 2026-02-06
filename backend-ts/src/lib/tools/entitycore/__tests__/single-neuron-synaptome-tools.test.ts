/**
 * Tests for Single Neuron Synaptome Tools
 *
 * Tests the SingleNeuronSynaptomeGetAllTool and SingleNeuronSynaptomeGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { SingleNeuronSynaptomeGetAllTool } from '../single-neuron-synaptome-getall';
import { SingleNeuronSynaptomeGetOneTool } from '../single-neuron-synaptome-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Single Neuron Synaptome Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SingleNeuronSynaptomeGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(SingleNeuronSynaptomeGetAllTool.toolName).toBe(
        'entitycore-singleneuronsynaptome-getall'
      );
      expect(SingleNeuronSynaptomeGetAllTool.toolNameFrontend).toBe(
        'Get All Single Neuron Synaptomes'
      );
      expect(SingleNeuronSynaptomeGetAllTool.toolDescription).toContain(
        'single-neuron-synaptomes'
      );
      expect(SingleNeuronSynaptomeGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(SingleNeuronSynaptomeGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SingleNeuronSynaptomeGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SingleNeuronSynaptomeGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

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

      // Test valid page_size
      const validInput = {
        page_size: 7,
      };

      const result3 = tool.inputSchema.safeParse(validInput);
      expect(result3.success).toBe(true);
    });

    it('should have default values', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

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
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

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

    it('should support ME model filtering', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        me_model__id: '123e4567-e89b-12d3-a456-426614174000',
        me_model__name: 'Test ME Model',
        me_model__name__ilike: 'Test%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support morphology filtering', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        me_model__morphology__id: '123e4567-e89b-12d3-a456-426614174000',
        me_model__morphology__name: 'Test Morphology',
        morphology__brain_region__id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support e-type and m-type filtering', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        me_model__etype__pref_label: 'cADpyr',
        me_model__mtype__pref_label: 'L5_TPC:A',
        emodel__etype__pref_label: 'bAC',
        emodel__mtype__pref_label: 'L2_IPC',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support species and strain filtering', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        me_model__species__name: 'Rattus norvegicus',
        me_model__strain__name: 'Wistar',
        subject__species__id: '123e4567-e89b-12d3-a456-426614174000',
        subject__strain__id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
        update_date__gte: '2023-06-01T00:00:00Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support contribution and creator filtering', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        contribution__pref_label: 'Test Contribution',
        contribution__id: '123e4567-e89b-12d3-a456-426614174000',
        created_by__pref_label: 'John Doe',
        created_by__given_name: 'John',
        created_by__family_name: 'Doe',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support search and ilike_search parameters', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        search: 'synaptome',
        ilike_search: 'test%',
        name__ilike: '%neuron%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pagination parameters', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);

      const input = {
        page: 2,
        page_size: 8,
        order_by: ['name', '-creation_date'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.page_size).toBe(8);
        expect(result.data.order_by).toEqual(['name', '-creation_date']);
      }
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SingleNeuronSynaptomeGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('SingleNeuronSynaptomeGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SingleNeuronSynaptomeGetOneTool.toolName).toBe(
        'entitycore-singleneuronsynaptome-getone'
      );
      expect(SingleNeuronSynaptomeGetOneTool.toolNameFrontend).toBe(
        'Get One Single Neuron Synaptome'
      );
      expect(SingleNeuronSynaptomeGetOneTool.toolDescription).toContain(
        'specific single-neuron-synaptome'
      );
      expect(SingleNeuronSynaptomeGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SingleNeuronSynaptomeGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(SingleNeuronSynaptomeGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SingleNeuronSynaptomeGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        single_neuron_synaptome_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        single_neuron_synaptome_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require single_neuron_synaptome_id', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);

      // Test missing single_neuron_synaptome_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty string as UUID', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);

      const invalidInput = {
        single_neuron_synaptome_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject malformed UUID', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);

      const invalidInput = {
        single_neuron_synaptome_id: '123e4567-e89b-12d3-a456',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept valid UUID with different formats', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);

      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000000',
      ];

      validUUIDs.forEach((uuid) => {
        const result = tool.inputSchema.safeParse({
          single_neuron_synaptome_id: uuid,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SingleNeuronSynaptomeGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(SingleNeuronSynaptomeGetAllTool.toolName).not.toBe(
        SingleNeuronSynaptomeGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(SingleNeuronSynaptomeGetAllTool.toolName).toMatch(
        /^entitycore-singleneuronsynaptome-/
      );
      expect(SingleNeuronSynaptomeGetOneTool.toolName).toMatch(
        /^entitycore-singleneuronsynaptome-/
      );
    });

    it('should have consistent frontend naming', () => {
      expect(SingleNeuronSynaptomeGetAllTool.toolNameFrontend).toContain('Single Neuron');
      expect(SingleNeuronSynaptomeGetOneTool.toolNameFrontend).toContain('Single Neuron');
    });
  });
});
