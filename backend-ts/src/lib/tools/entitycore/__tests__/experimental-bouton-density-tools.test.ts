/**
 * Tests for Experimental Bouton Density Tools
 *
 * Tests the ExperimentalBoutonDensityGetAllTool and ExperimentalBoutonDensityGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { ExperimentalBoutonDensityGetAllTool } from '../experimental-bouton-density-getall';
import { ExperimentalBoutonDensityGetOneTool } from '../experimental-bouton-density-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Experimental Bouton Density Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('ExperimentalBoutonDensityGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolName).toBe(
        'entitycore-experimentalboutondensity-getall'
      );
      expect(ExperimentalBoutonDensityGetAllTool.toolNameFrontend).toBe(
        'Get All Experimental Bouton Densities'
      );
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain('bouton densities');
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain('brain region');
      expect(ExperimentalBoutonDensityGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(ExperimentalBoutonDensityGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(ExperimentalBoutonDensityGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ExperimentalBoutonDensityGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
        page_size: 5,
        page: 1,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
      expect(result.with_facets).toBe(false);
    });

    it('should accept within_brain_region_direction enum values', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      const validDirections = ['ascendants', 'descendants', 'ascendants_and_descendants'];

      validDirections.forEach((direction) => {
        const input = {
          within_brain_region_direction: direction as any,
        };

        const result = tool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.within_brain_region_direction).toBe(direction);
        }
      });
    });

    it('should reject invalid within_brain_region_direction', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      const input = {
        within_brain_region_direction: 'invalid_direction' as any,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept optional filtering parameters', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      const input = {
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
        subject__species__name: 'Mus musculus',
        page_size: 3,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.within_brain_region_brain_region_id).toBe(
          '123e4567-e89b-12d3-a456-426614174000'
        );
        expect(result.data.subject__species__name).toBe('Mus musculus');
        expect(result.data.page_size).toBe(3);
      }
    });

    it('should exclude brain_region name-based parameters', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      // These parameters should be excluded from the schema
      const input = {
        brain_region__name: 'Hippocampus' as any,
        brain_region__name__in: ['Hippocampus', 'Cortex'] as any,
        brain_region__name__ilike: 'hippo%' as any,
      };

      const result = tool.inputSchema.safeParse(input);
      // The parse should succeed but the excluded fields should not be present
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('brain_region__name');
        expect(result.data).not.toHaveProperty('brain_region__name__in');
        expect(result.data).not.toHaveProperty('brain_region__name__ilike');
      }
    });

    it('should accept array parameters', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);

      const input = {
        mtype__pref_label__in: ['L2/3 IT', 'L5 PT'],
        subject__species__name__in: ['Mus musculus', 'Rattus norvegicus'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mtype__pref_label__in).toEqual(['L2/3 IT', 'L5 PT']);
        expect(result.data.subject__species__name__in).toEqual([
          'Mus musculus',
          'Rattus norvegicus',
        ]);
      }
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ExperimentalBoutonDensityGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('ExperimentalBoutonDensityGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(ExperimentalBoutonDensityGetOneTool.toolName).toBe(
        'entitycore-experimentalboutondensity-getone'
      );
      expect(ExperimentalBoutonDensityGetOneTool.toolNameFrontend).toBe(
        'Get One Experimental Bouton Density'
      );
      expect(ExperimentalBoutonDensityGetOneTool.toolDescription).toContain(
        'specific experimental bouton density'
      );
      expect(ExperimentalBoutonDensityGetOneTool.toolDescription).toContain('bouton_density_id');
      expect(ExperimentalBoutonDensityGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(ExperimentalBoutonDensityGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(ExperimentalBoutonDensityGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new ExperimentalBoutonDensityGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ExperimentalBoutonDensityGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ExperimentalBoutonDensityGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        bouton_density_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new ExperimentalBoutonDensityGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        bouton_density_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require bouton_density_id parameter', () => {
      const tool = new ExperimentalBoutonDensityGetOneTool(mockContextVariables);

      // Test missing bouton_density_id
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ExperimentalBoutonDensityGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolName).not.toBe(
        ExperimentalBoutonDensityGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolName).toMatch(
        /^entitycore-experimentalboutondensity-/
      );
      expect(ExperimentalBoutonDensityGetOneTool.toolName).toMatch(
        /^entitycore-experimentalboutondensity-/
      );
    });

    it('should follow getall/getone naming convention', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolName).toContain('-getall');
      expect(ExperimentalBoutonDensityGetOneTool.toolName).toContain('-getone');
    });
  });

  describe('Tool Descriptions', () => {
    it('should have frontend-friendly descriptions', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolDescriptionFrontend).toContain(
        'Search and retrieve'
      );
      expect(ExperimentalBoutonDensityGetOneTool.toolDescriptionFrontend).toContain(
        'Get detailed information'
      );
    });

    it('should mention key output fields', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain('bouton density ID');
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain('brain region');
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain('measurements');
      expect(ExperimentalBoutonDensityGetOneTool.toolDescription).toContain('bouton density ID');
      expect(ExperimentalBoutonDensityGetOneTool.toolDescription).toContain('measurements');
      expect(ExperimentalBoutonDensityGetOneTool.toolDescription).toContain('assets');
    });

    it('should mention contributions exclusion in GetAll', () => {
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain(
        'exclude the contributions'
      );
      expect(ExperimentalBoutonDensityGetAllTool.toolDescription).toContain('Get One');
    });
  });

  describe('Tool Utterances', () => {
    it('should have relevant utterances for GetAll', () => {
      const utterances = ExperimentalBoutonDensityGetAllTool.toolUtterances;
      expect(utterances.some((u) => u.toLowerCase().includes('bouton densities'))).toBe(true);
      expect(
        utterances.some((u) => u.toLowerCase().includes('find') || u.toLowerCase().includes('show'))
      ).toBe(true);
    });

    it('should have relevant utterances for GetOne', () => {
      const utterances = ExperimentalBoutonDensityGetOneTool.toolUtterances;
      expect(utterances.some((u) => u.toLowerCase().includes('bouton density'))).toBe(true);
      expect(
        utterances.some(
          (u) => u.toLowerCase().includes('details') || u.toLowerCase().includes('information')
        )
      ).toBe(true);
    });
  });
});
