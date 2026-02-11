/**
 * Tests for Measurement Annotation Tools
 *
 * Tests the MeasurementAnnotationGetAllTool and MeasurementAnnotationGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { MeasurementAnnotationGetAllTool } from '../measurement-annotation-getall';
import { MeasurementAnnotationGetOneTool } from '../measurement-annotation-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Measurement Annotation Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('MeasurementAnnotationGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(MeasurementAnnotationGetAllTool.toolName).toBe('entitycore-measurementannotation-getall');
      expect(MeasurementAnnotationGetAllTool.toolNameFrontend).toBe('Get All Measurement Annotations');
      expect(MeasurementAnnotationGetAllTool.toolDescription).toContain('measurement annotations');
      expect(MeasurementAnnotationGetAllTool.toolDescription).toContain('measurement annotation ID');
      expect(MeasurementAnnotationGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(MeasurementAnnotationGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(MeasurementAnnotationGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        entity_type: 'cell_morphology',
        page_size: 5,
        page: 1,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should accept brain region filtering parameters', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const input = {
        within_brain_region_brain_region_id: '123e4567-e89b-12d3-a456-426614174000',
        within_brain_region_direction: 'descendants' as const,
        page_size: 3,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.within_brain_region_brain_region_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.within_brain_region_direction).toBe('descendants');
        expect(result.data.page_size).toBe(3);
      }
    });

    it('should accept entity filtering parameters', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const input = {
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        entity_type: 'cell_morphology',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entity_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.entity_type).toBe('cell_morphology');
      }
    });

    it('should accept measurement kind filtering parameters', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const input = {
        measurement_kind__pref_label: 'soma radius',
        measurement_kind__structural_domain: 'soma',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.measurement_kind__pref_label).toBe('soma radius');
        expect(result.data.measurement_kind__structural_domain).toBe('soma');
      }
    });

    it('should accept measurement item filtering parameters', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const input = {
        measurement_item__name: 'mean',
        measurement_item__unit: 'μm',
        measurement_item__value__gte: 10.0,
        measurement_item__value__lte: 100.0,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.measurement_item__name).toBe('mean');
        expect(result.data.measurement_item__unit).toBe('μm');
        expect(result.data.measurement_item__value__gte).toBe(10.0);
        expect(result.data.measurement_item__value__lte).toBe(100.0);
      }
    });

    it('should accept array parameters', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id__in?.length).toBe(2);
      }
    });

    it('should accept date filtering parameters', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const input = {
        creation_date__gte: '2024-01-01T00:00:00Z',
        creation_date__lte: '2024-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creation_date__gte).toBe('2024-01-01T00:00:00Z');
        expect(result.data.creation_date__lte).toBe('2024-12-31T23:59:59Z');
      }
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      // Test invalid direction
      const invalidInput = {
        within_brain_region_direction: 'invalid_direction',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept valid within_brain_region_direction values', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);

      const directions = ['ascendants', 'descendants', 'ascendants_and_descendants'] as const;

      directions.forEach((direction) => {
        const input = { within_brain_region_direction: direction };
        const result = tool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.within_brain_region_direction).toBe(direction);
        }
      });
    });

    it('should convert to Vercel tool format', () => {
      const tool = new MeasurementAnnotationGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('MeasurementAnnotationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(MeasurementAnnotationGetOneTool.toolName).toBe('entitycore-measurementannotation-getone');
      expect(MeasurementAnnotationGetOneTool.toolNameFrontend).toBe('Get One Measurement Annotation');
      expect(MeasurementAnnotationGetOneTool.toolDescription).toContain('specific measurement annotation');
      expect(MeasurementAnnotationGetOneTool.toolDescription).toContain('measurement_annotation_id');
      expect(MeasurementAnnotationGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(MeasurementAnnotationGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new MeasurementAnnotationGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(MeasurementAnnotationGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new MeasurementAnnotationGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        measurement_annotation_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new MeasurementAnnotationGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        measurement_annotation_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require measurement_annotation_id parameter', () => {
      const tool = new MeasurementAnnotationGetOneTool(mockContextVariables);

      // Test missing measurement_annotation_id
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new MeasurementAnnotationGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(MeasurementAnnotationGetAllTool.toolName).not.toBe(MeasurementAnnotationGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(MeasurementAnnotationGetAllTool.toolName).toMatch(/^entitycore-measurementannotation-/);
      expect(MeasurementAnnotationGetOneTool.toolName).toMatch(/^entitycore-measurementannotation-/);
    });

    it('should follow getall/getone naming convention', () => {
      expect(MeasurementAnnotationGetAllTool.toolName).toContain('-getall');
      expect(MeasurementAnnotationGetOneTool.toolName).toContain('-getone');
    });
  });

  describe('Tool Descriptions', () => {
    it('should have frontend-friendly descriptions', () => {
      expect(MeasurementAnnotationGetAllTool.toolDescriptionFrontend).toContain('Search and retrieve');
      expect(MeasurementAnnotationGetOneTool.toolDescriptionFrontend).toContain('Get detailed information');
    });

    it('should mention key output fields', () => {
      expect(MeasurementAnnotationGetAllTool.toolDescription).toContain('measurement annotation ID');
      expect(MeasurementAnnotationGetAllTool.toolDescription).toContain('entity type');
      expect(MeasurementAnnotationGetOneTool.toolDescription).toContain('measurement annotation ID');
      expect(MeasurementAnnotationGetOneTool.toolDescription).toContain('measurement kinds');
    });

    it('should mention measurement kinds exclusion in GetAll', () => {
      expect(MeasurementAnnotationGetAllTool.toolDescription).toContain('exclude the measurement kinds');
      expect(MeasurementAnnotationGetAllTool.toolDescription).toContain('Get One Measurement Annotation tool');
    });
  });

  describe('Tool Utterances', () => {
    it('should have relevant utterances for GetAll', () => {
      const utterances = MeasurementAnnotationGetAllTool.toolUtterances;
      expect(utterances.some(u => u.toLowerCase().includes('measurement annotation'))).toBe(true);
      expect(utterances.some(u => u.toLowerCase().includes('find') || u.toLowerCase().includes('show'))).toBe(true);
    });

    it('should have relevant utterances for GetOne', () => {
      const utterances = MeasurementAnnotationGetOneTool.toolUtterances;
      expect(utterances.some(u => u.toLowerCase().includes('measurement annotation'))).toBe(true);
      expect(utterances.some(u => u.toLowerCase().includes('details') || u.toLowerCase().includes('information'))).toBe(true);
    });
  });
});
