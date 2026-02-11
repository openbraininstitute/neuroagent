/**
 * Tests for Electrical Cell Recording Tools
 *
 * Tests the ElectricalCellRecordingGetAllTool and ElectricalCellRecordingGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { ElectricalCellRecordingGetAllTool } from '../electrical-cell-recording-getall';
import { ElectricalCellRecordingGetOneTool } from '../electrical-cell-recording-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Electrical Cell Recording Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('ElectricalCellRecordingGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(ElectricalCellRecordingGetAllTool.toolName).toBe(
        'entitycore-electricalcellrecording-getall'
      );
      expect(ElectricalCellRecordingGetAllTool.toolNameFrontend).toBe(
        'Get All Electrical Cell Recordings'
      );
      expect(ElectricalCellRecordingGetAllTool.toolDescription).toContain(
        'electrical cell recordings'
      );
      expect(ElectricalCellRecordingGetAllTool.toolDescription).toContain('trace');
      expect(ElectricalCellRecordingGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(ElectricalCellRecordingGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ElectricalCellRecordingGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

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
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

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
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

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
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

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

    it('should support recording_type filter', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      // Valid recording types: 'intracellular', 'extracellular', 'both', 'unknown'
      const input = {
        recording_type: 'intracellular',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support recording_origin filter', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      // Valid recording origins: 'in_vivo', 'in_vitro', 'in_silico', 'unknown'
      const input = {
        recording_origin: 'in_vivo',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support subject species filters', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      const input = {
        subject__species__name: 'Rattus norvegicus',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support etype filters', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);

      const input = {
        etype__pref_label: 'cADpyr',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ElectricalCellRecordingGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should include trace terminology in utterances', () => {
      const utterances = ElectricalCellRecordingGetAllTool.toolUtterances;
      const hasTraceUtterance = utterances.some((u) => u.toLowerCase().includes('trace'));
      expect(hasTraceUtterance).toBe(true);
    });
  });

  describe('ElectricalCellRecordingGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(ElectricalCellRecordingGetOneTool.toolName).toBe(
        'entitycore-electricalcellrecording-getone'
      );
      expect(ElectricalCellRecordingGetOneTool.toolNameFrontend).toBe(
        'Get One Electrical Cell Recording'
      );
      expect(ElectricalCellRecordingGetOneTool.toolDescription).toContain(
        'specific electrical cell recording'
      );
      expect(ElectricalCellRecordingGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(ElectricalCellRecordingGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new ElectricalCellRecordingGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ElectricalCellRecordingGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ElectricalCellRecordingGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        recording_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new ElectricalCellRecordingGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        recording_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require recording_id', () => {
      const tool = new ElectricalCellRecordingGetOneTool(mockContextVariables);

      // Test missing recording_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ElectricalCellRecordingGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should mention stimuli in description', () => {
      expect(ElectricalCellRecordingGetOneTool.toolDescription).toContain('Stimuli');
    });

    it('should mention liquid junction potential in description', () => {
      expect(ElectricalCellRecordingGetOneTool.toolDescription).toContain(
        'liquid junction potential'
      );
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(ElectricalCellRecordingGetAllTool.toolName).not.toBe(
        ElectricalCellRecordingGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(ElectricalCellRecordingGetAllTool.toolName).toMatch(
        /^entitycore-electricalcellrecording-/
      );
      expect(ElectricalCellRecordingGetOneTool.toolName).toMatch(
        /^entitycore-electricalcellrecording-/
      );
    });

    it('should follow getall/getone naming convention', () => {
      expect(ElectricalCellRecordingGetAllTool.toolName).toContain('-getall');
      expect(ElectricalCellRecordingGetOneTool.toolName).toContain('-getone');
    });
  });

  describe('Health Check', () => {
    it('should have static isOnline method', () => {
      expect(typeof ElectricalCellRecordingGetAllTool.isOnline).toBe('function');
      expect(typeof ElectricalCellRecordingGetOneTool.isOnline).toBe('function');
    });
  });
});
