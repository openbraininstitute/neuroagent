/**
 * Tests for Organization Tools
 *
 * Tests the OrganizationGetAllTool and OrganizationGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { OrganizationGetAllTool } from '../organization-getall';
import { OrganizationGetOneTool } from '../organization-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Organization Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('OrganizationGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(OrganizationGetAllTool.toolName).toBe('entitycore-organization-getall');
      expect(OrganizationGetAllTool.toolNameFrontend).toBe('Get All Organizations');
      expect(OrganizationGetAllTool.toolDescription).toContain('organizations');
      expect(OrganizationGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(OrganizationGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(OrganizationGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        pref_label: 'Blue Brain Project',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should support pref_label filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        pref_label: 'Blue Brain Project',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label__in filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        pref_label__in: ['Blue Brain Project', 'Human Brain Project'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pref_label__ilike filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        pref_label__ilike: 'brain%',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support ID filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support id__in filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        id__in: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate UUID format for ID filters', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        id: 'not-a-uuid',
      };
      const invalidResult = tool.inputSchema.safeParse(invalidInput);
      expect(invalidResult.success).toBe(false);
    });

    it('should support alternative_name filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        alternative_name: 'BBP',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support created_by filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        created_by__pref_label: 'John Doe',
        created_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support updated_by filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        updated_by__pref_label: 'Jane Smith',
        updated_by__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support type filtering', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        type: 'organization' as const,
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should support pagination', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

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

    it('should support order_by parameter', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);

      const input = {
        order_by: ['pref_label', '-creation_date'],
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new OrganizationGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('OrganizationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(OrganizationGetOneTool.toolName).toBe('entitycore-organization-getone');
      expect(OrganizationGetOneTool.toolNameFrontend).toBe('Get One Organization');
      expect(OrganizationGetOneTool.toolDescription).toContain('specific organization');
      expect(OrganizationGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(OrganizationGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(OrganizationGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        organization_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require organization_id', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);

      // Test missing organization_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty organization_id', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);

      const invalidInput = {
        organization_id: '',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject null organization_id', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);

      const invalidInput = {
        organization_id: null,
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new OrganizationGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(OrganizationGetAllTool.toolName).not.toBe(OrganizationGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(OrganizationGetAllTool.toolName).toMatch(/^entitycore-organization-/);
      expect(OrganizationGetOneTool.toolName).toMatch(/^entitycore-organization-/);
    });

    it('should have descriptive frontend names', () => {
      expect(OrganizationGetAllTool.toolNameFrontend).toContain('Organization');
      expect(OrganizationGetOneTool.toolNameFrontend).toContain('Organization');
    });

    it('should have non-empty descriptions', () => {
      expect(OrganizationGetAllTool.toolDescription.length).toBeGreaterThan(0);
      expect(OrganizationGetOneTool.toolDescription.length).toBeGreaterThan(0);
      expect(OrganizationGetAllTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
      expect(OrganizationGetOneTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
    });

    it('should have at least one utterance each', () => {
      expect(OrganizationGetAllTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
      expect(OrganizationGetOneTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
    });
  });
});
