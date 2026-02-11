/**
 * Tests for Brain Region Tools
 *
 * Tests the BrainRegionGetAllTool and BrainRegionGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { BrainRegionGetAllTool } from '../brain-region-getall';
import { BrainRegionGetOneTool } from '../brain-region-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Brain Region Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('BrainRegionGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(BrainRegionGetAllTool.toolName).toBe('entitycore-brainregion-getall');
      expect(BrainRegionGetAllTool.toolNameFrontend).toBe('Get All Brain Regions');
      expect(BrainRegionGetAllTool.toolDescription).toContain('knowledge graph');
      expect(BrainRegionGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(BrainRegionGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new BrainRegionGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(BrainRegionGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new BrainRegionGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        semantic_search: 'hippocampus',
        page_size: 5,
        hierarchy_id: 'e3e70682-c209-4cac-a29f-6fbed82c07cd' as const,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new BrainRegionGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new BrainRegionGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.hierarchy_id).toBe('e3e70682-c209-4cac-a29f-6fbed82c07cd');
      expect(result.order_by).toEqual(['name']);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new BrainRegionGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('BrainRegionGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(BrainRegionGetOneTool.toolName).toBe('entitycore-brainregion-getone');
      expect(BrainRegionGetOneTool.toolNameFrontend).toBe('Get One Brain Region');
      expect(BrainRegionGetOneTool.toolDescription).toContain('specific brain region');
      expect(BrainRegionGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(BrainRegionGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new BrainRegionGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(BrainRegionGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new BrainRegionGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        brainregion_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new BrainRegionGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        brainregion_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new BrainRegionGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(BrainRegionGetAllTool.toolName).not.toBe(BrainRegionGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(BrainRegionGetAllTool.toolName).toMatch(/^entitycore-brainregion-/);
      expect(BrainRegionGetOneTool.toolName).toMatch(/^entitycore-brainregion-/);
    });
  });
});
