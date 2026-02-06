/**
 * Tests for Brain Region Hierarchy Tools
 *
 * Tests the BrainRegionHierarchyGetAllTool and BrainRegionHierarchyGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { BrainRegionHierarchyGetAllTool } from '../brain-region-hierarchy-getall';
import { BrainRegionHierarchyGetOneTool } from '../brain-region-hierarchy-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Brain Region Hierarchy Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('BrainRegionHierarchyGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(BrainRegionHierarchyGetAllTool.toolName).toBe('entitycore-brainregionhierarchy-getall');
      expect(BrainRegionHierarchyGetAllTool.toolNameFrontend).toBe('Get All Brain Region Hierarchies');
      expect(BrainRegionHierarchyGetAllTool.toolDescription).toContain('knowledge graph');
      expect(BrainRegionHierarchyGetAllTool.toolDescription).toContain('hierarchies');
      expect(BrainRegionHierarchyGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(BrainRegionHierarchyGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(BrainRegionHierarchyGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(BrainRegionHierarchyGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        name: 'Allen Brain Atlas',
        page_size: 5,
        page: 1,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['name']);
      expect(result.with_facets).toBe(false);
    });

    it('should accept optional filtering parameters', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);

      const input = {
        name: 'Allen',
        species__name: 'Mus musculus',
        page_size: 3,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Allen');
        expect(result.data.species__name).toBe('Mus musculus');
        expect(result.data.page_size).toBe(3);
      }
    });

    it('should accept array parameters', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);

      const input = {
        name__in: ['Allen', 'Julich'],
        species_id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name__in).toEqual(['Allen', 'Julich']);
        expect(result.data.species_id__in?.length).toBe(2);
      }
    });

    it('should convert to Vercel tool format', () => {
      const tool = new BrainRegionHierarchyGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('BrainRegionHierarchyGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(BrainRegionHierarchyGetOneTool.toolName).toBe('entitycore-brainregionhierarchy-getone');
      expect(BrainRegionHierarchyGetOneTool.toolNameFrontend).toBe('Get One Brain Region Hierarchy');
      expect(BrainRegionHierarchyGetOneTool.toolDescription).toContain('specific brain region hierarchy');
      expect(BrainRegionHierarchyGetOneTool.toolDescription).toContain('hierarchy_id');
      expect(BrainRegionHierarchyGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(BrainRegionHierarchyGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(BrainRegionHierarchyGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new BrainRegionHierarchyGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(BrainRegionHierarchyGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new BrainRegionHierarchyGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        hierarchy_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new BrainRegionHierarchyGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        hierarchy_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require hierarchy_id parameter', () => {
      const tool = new BrainRegionHierarchyGetOneTool(mockContextVariables);

      // Test missing hierarchy_id
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new BrainRegionHierarchyGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(BrainRegionHierarchyGetAllTool.toolName).not.toBe(BrainRegionHierarchyGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(BrainRegionHierarchyGetAllTool.toolName).toMatch(/^entitycore-brainregionhierarchy-/);
      expect(BrainRegionHierarchyGetOneTool.toolName).toMatch(/^entitycore-brainregionhierarchy-/);
    });

    it('should follow getall/getone naming convention', () => {
      expect(BrainRegionHierarchyGetAllTool.toolName).toContain('-getall');
      expect(BrainRegionHierarchyGetOneTool.toolName).toContain('-getone');
    });
  });

  describe('Tool Descriptions', () => {
    it('should have frontend-friendly descriptions', () => {
      expect(BrainRegionHierarchyGetAllTool.toolDescriptionFrontend).toContain('Search and retrieve');
      expect(BrainRegionHierarchyGetOneTool.toolDescriptionFrontend).toContain('Get detailed information');
    });

    it('should mention key output fields', () => {
      expect(BrainRegionHierarchyGetAllTool.toolDescription).toContain('hierarchy ID');
      expect(BrainRegionHierarchyGetAllTool.toolDescription).toContain('hierarchy name');
      expect(BrainRegionHierarchyGetOneTool.toolDescription).toContain('hierarchy ID');
      expect(BrainRegionHierarchyGetOneTool.toolDescription).toContain('hierarchy name');
    });
  });

  describe('Tool Utterances', () => {
    it('should have relevant utterances for GetAll', () => {
      const utterances = BrainRegionHierarchyGetAllTool.toolUtterances;
      expect(utterances.some(u => u.toLowerCase().includes('hierarchies'))).toBe(true);
      expect(utterances.some(u => u.toLowerCase().includes('find') || u.toLowerCase().includes('show'))).toBe(true);
    });

    it('should have relevant utterances for GetOne', () => {
      const utterances = BrainRegionHierarchyGetOneTool.toolUtterances;
      expect(utterances.some(u => u.toLowerCase().includes('hierarchy'))).toBe(true);
      expect(utterances.some(u => u.toLowerCase().includes('details') || u.toLowerCase().includes('information'))).toBe(true);
    });
  });
});
