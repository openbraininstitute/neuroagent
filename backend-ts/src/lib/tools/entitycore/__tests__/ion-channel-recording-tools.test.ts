/**
 * Tests for Ion Channel Recording Tools
 *
 * Tests the IonChannelRecordingGetAllTool and IonChannelRecordingGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { IonChannelRecordingGetAllTool } from '../ion-channel-recording-getall';
import { IonChannelRecordingGetOneTool } from '../ion-channel-recording-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Ion Channel Recording Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('IonChannelRecordingGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(IonChannelRecordingGetAllTool.toolName).toBe(
        'entitycore-ionchannelrecording-getall'
      );
      expect(IonChannelRecordingGetAllTool.toolNameFrontend).toBe(
        'Get All Ion Channel Recordings'
      );
      expect(IonChannelRecordingGetAllTool.toolDescription).toContain(
        'ion-channel-recordings'
      );
      expect(IonChannelRecordingGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(IonChannelRecordingGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(IonChannelRecordingGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(IonChannelRecordingGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

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
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.within_brain_region_direction).toBe('ascendants_and_descendants');
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should validate within_brain_region_direction enum', () => {
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

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
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

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
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);

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

    it('should convert to Vercel tool format', () => {
      const tool = new IonChannelRecordingGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should mention knowledge graph in description', () => {
      expect(IonChannelRecordingGetAllTool.toolDescription).toContain('knowledge graph');
    });

    it('should mention timestamps in description', () => {
      expect(IonChannelRecordingGetAllTool.toolDescription).toContain('timestamps');
    });
  });

  describe('IonChannelRecordingGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(IonChannelRecordingGetOneTool.toolName).toBe(
        'entitycore-ionchannelrecording-getone'
      );
      expect(IonChannelRecordingGetOneTool.toolNameFrontend).toBe(
        'Get One Ion Channel Recording'
      );
      expect(IonChannelRecordingGetOneTool.toolDescription).toContain(
        'specific ion-channel-recording'
      );
      expect(IonChannelRecordingGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(IonChannelRecordingGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(IonChannelRecordingGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new IonChannelRecordingGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(IonChannelRecordingGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new IonChannelRecordingGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        ion_channel_recording_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new IonChannelRecordingGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        ion_channel_recording_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require ion_channel_recording_id', () => {
      const tool = new IonChannelRecordingGetOneTool(mockContextVariables);

      // Test missing ion_channel_recording_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new IonChannelRecordingGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should mention knowledge graph in description', () => {
      expect(IonChannelRecordingGetOneTool.toolDescription).toContain('knowledge graph');
    });

    it('should mention creation and update dates in description', () => {
      expect(IonChannelRecordingGetOneTool.toolDescription).toContain(
        'Creation and update dates'
      );
    });

    it('should mention metadata and relationships in description', () => {
      expect(IonChannelRecordingGetOneTool.toolDescription).toContain(
        'metadata and relationships'
      );
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(IonChannelRecordingGetAllTool.toolName).not.toBe(
        IonChannelRecordingGetOneTool.toolName
      );
    });

    it('should have consistent naming pattern', () => {
      expect(IonChannelRecordingGetAllTool.toolName).toMatch(
        /^entitycore-ionchannelrecording-/
      );
      expect(IonChannelRecordingGetOneTool.toolName).toMatch(/^entitycore-ionchannelrecording-/);
    });

    it('should follow getall/getone naming convention', () => {
      expect(IonChannelRecordingGetAllTool.toolName).toContain('-getall');
      expect(IonChannelRecordingGetOneTool.toolName).toContain('-getone');
    });
  });

  describe('Health Check', () => {
    it('should have static isOnline method', () => {
      expect(typeof IonChannelRecordingGetAllTool.isOnline).toBe('function');
      expect(typeof IonChannelRecordingGetOneTool.isOnline).toBe('function');
    });
  });
});
