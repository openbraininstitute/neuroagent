/**
 * Tests for Ion Channel Model Tools
 *
 * Tests the IonChannelModelGetAllTool and IonChannelModelGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { IonChannelModelGetAllTool } from '../ion-channel-model-getall';
import { IonChannelModelGetOneTool } from '../ion-channel-model-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Ion Channel Model Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('IonChannelModelGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(IonChannelModelGetAllTool.toolName).toBe('entitycore-ionchannelmodel-getall');
      expect(IonChannelModelGetAllTool.toolNameFrontend).toBe('Get All Ion Channel Models');
      expect(IonChannelModelGetAllTool.toolDescription).toContain('ion channel models');
      expect(IonChannelModelGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(IonChannelModelGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(IonChannelModelGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(IonChannelModelGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

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
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

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
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

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
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

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
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        subject__species__name: 'Rattus norvegicus',
        subject__species__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support ion channel model specific filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        nmodl_suffix: 'NaTs2_t',
        is_ljp_corrected: true,
        is_temperature_dependent: false,
        is_stochastic: false,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support temperature filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        temperature_celsius: 34,
        temperature_celsius__gte: 30,
        temperature_celsius__lte: 37,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support conductance and permeability filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        conductance_name: 'gNaTs2_tbar',
        max_permeability_name: 'pCa',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support brain region hierarchy filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        brain_region__id: '123e4567-e89b-12d3-a456-426614174000',
        brain_region__acronym: 'CA1',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support subject filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        subject__name: 'Subject-001',
        subject__age_value: 'P14',
        subject__strain__name: 'Wistar',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support contribution filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        contribution__pref_label: 'John Doe',
        contribution__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2023-01-01T00:00:00Z',
        creation_date__lte: '2023-12-31T23:59:59Z',
        experiment_date__gte: '2023-01-01T00:00:00Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support search and ordering', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);

      const input = {
        search: 'sodium channel',
        ilike_search: '%NaTs%',
        order_by: ['name', '-creation_date'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new IonChannelModelGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('IonChannelModelGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(IonChannelModelGetOneTool.toolName).toBe('entitycore-ionchannelmodel-getone');
      expect(IonChannelModelGetOneTool.toolNameFrontend).toBe('Get One Ion Channel Model');
      expect(IonChannelModelGetOneTool.toolDescription).toContain('specific ion channel model');
      expect(IonChannelModelGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(IonChannelModelGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(IonChannelModelGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new IonChannelModelGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(IonChannelModelGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new IonChannelModelGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        ion_channel_model_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new IonChannelModelGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        ion_channel_model_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require ion_channel_model_id', () => {
      const tool = new IonChannelModelGetOneTool(mockContextVariables);

      // Test missing ion_channel_model_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new IonChannelModelGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(IonChannelModelGetAllTool.toolName).not.toBe(IonChannelModelGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(IonChannelModelGetAllTool.toolName).toMatch(/^entitycore-ionchannelmodel-/);
      expect(IonChannelModelGetOneTool.toolName).toMatch(/^entitycore-ionchannelmodel-/);
    });

    it('should have descriptive frontend names', () => {
      expect(IonChannelModelGetAllTool.toolNameFrontend).toContain('Ion Channel Model');
      expect(IonChannelModelGetOneTool.toolNameFrontend).toContain('Ion Channel Model');
    });
  });
});
