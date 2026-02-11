/**
 * Tests for Experimental Synapses Per Connection Tools
 *
 * Tests the ExperimentalSynapsesPerConnectionGetAllTool and ExperimentalSynapsesPerConnectionGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { ExperimentalSynapsesPerConnectionGetAllTool } from '../experimental-synapses-per-connection-getall';
import { ExperimentalSynapsesPerConnectionGetOneTool } from '../experimental-synapses-per-connection-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Experimental Synapses Per Connection Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('ExperimentalSynapsesPerConnectionGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolName).toBe(
        'entitycore-experimentalsynapsesperconnection-getall'
      );
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolNameFrontend).toBe(
        'Get All Experimental Synapses Per Connection'
      );
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolDescription).toContain(
        'experimental synapses per connection'
      );
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolDescription).toContain('measurements');
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ExperimentalSynapsesPerConnectionGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        page: 1,
        within_brain_region_direction: 'ascendants_and_descendants' as const,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['-creation_date']);
      expect(result.with_facets).toBe(false);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
    });

    it('should accept optional filtering parameters', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      const input = {
        subject__species__name: 'Mus musculus',
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
        page_size: 3,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subject__species__name).toBe('Mus musculus');
        expect(result.data.within_brain_region_brain_region_id).toBe(
          '123e4567-e89b-12d3-a456-426614174000'
        );
        expect(result.data.page_size).toBe(3);
      }
    });

    it('should accept within_brain_region_direction values', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      const directions = ['ascendants', 'descendants', 'ascendants_and_descendants'] as const;

      directions.forEach((direction) => {
        const input = {
          within_brain_region_direction: direction,
        };

        const result = tool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.within_brain_region_direction).toBe(direction);
        }
      });
    });

    it('should accept array parameters', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      const input = {
        subject__species__name__in: ['Mus musculus', 'Rattus norvegicus'],
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subject__species__name__in).toEqual([
          'Mus musculus',
          'Rattus norvegicus',
        ]);
        expect(result.data.id__in?.length).toBe(2);
      }
    });

    it('should accept pre and post mtype filters', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      const input = {
        pre_mtype__pref_label: 'L5_TPC:A',
        post_mtype__pref_label: 'L6_TPC:A',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pre_mtype__pref_label).toBe('L5_TPC:A');
        expect(result.data.post_mtype__pref_label).toBe('L6_TPC:A');
      }
    });

    it('should accept pre and post region filters', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      const input = {
        pre_region__id: '123e4567-e89b-12d3-a456-426614174000',
        post_region__id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pre_region__id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.post_region__id).toBe('123e4567-e89b-12d3-a456-426614174001');
      }
    });

    it('should exclude brain_region name-based parameters', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);

      // These parameters should not exist in the schema
      const input = {
        brain_region__name: 'Hippocampus',
        brain_region__name__in: ['Hippocampus', 'Cortex'],
        brain_region__name__ilike: 'hippo%',
      };

      const result = tool.inputSchema.safeParse(input);
      // Should succeed but exclude the brain_region name parameters
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('brain_region__name');
        expect(result.data).not.toHaveProperty('brain_region__name__in');
        expect(result.data).not.toHaveProperty('brain_region__name__ilike');
      }
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('ExperimentalSynapsesPerConnectionGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolName).toBe(
        'entitycore-experimentalsynapsesperconnection-getone'
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolNameFrontend).toBe(
        'Get One Experimental Synapses Per Connection'
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolDescription).toContain(
        'specific experimental synapses per connection'
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolDescription).toContain(
        'synapses_per_connection_id'
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ExperimentalSynapsesPerConnectionGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        synapses_per_connection_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        synapses_per_connection_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require synapses_per_connection_id parameter', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetOneTool(mockContextVariables);

      // Test missing synapses_per_connection_id
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ExperimentalSynapsesPerConnectionGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolName).not.toBe(
        ExperimentalSynapsesPerConnectionGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolName).toMatch(
        /^entitycore-experimentalsynapsesperconnection-/
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolName).toMatch(
        /^entitycore-experimentalsynapsesperconnection-/
      );
    });

    it('should follow getall/getone naming convention', () => {
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolName).toContain('-getall');
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolName).toContain('-getone');
    });
  });

  describe('Tool Descriptions', () => {
    it('should have frontend-friendly descriptions', () => {
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolDescriptionFrontend).toContain(
        'Search and retrieve'
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolDescriptionFrontend).toContain(
        'Get detailed information'
      );
    });

    it('should mention key output fields', () => {
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolDescription).toContain(
        'synapses per connection ID'
      );
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolDescription).toContain('measurements');
      expect(ExperimentalSynapsesPerConnectionGetAllTool.toolDescription).toContain('mtypes');
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolDescription).toContain(
        'synapses per connection ID'
      );
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolDescription).toContain('measurements');
      expect(ExperimentalSynapsesPerConnectionGetOneTool.toolDescription).toContain('contributions');
    });
  });

  describe('Tool Utterances', () => {
    it('should have relevant utterances for GetAll', () => {
      const utterances = ExperimentalSynapsesPerConnectionGetAllTool.toolUtterances;
      expect(
        utterances.some((u) => u.toLowerCase().includes('synapses per connection'))
      ).toBe(true);
      expect(
        utterances.some((u) => u.toLowerCase().includes('find') || u.toLowerCase().includes('show'))
      ).toBe(true);
    });

    it('should have relevant utterances for GetOne', () => {
      const utterances = ExperimentalSynapsesPerConnectionGetOneTool.toolUtterances;
      expect(
        utterances.some((u) => u.toLowerCase().includes('synapses per connection'))
      ).toBe(true);
      expect(
        utterances.some(
          (u) => u.toLowerCase().includes('details') || u.toLowerCase().includes('information')
        )
      ).toBe(true);
    });
  });
});
