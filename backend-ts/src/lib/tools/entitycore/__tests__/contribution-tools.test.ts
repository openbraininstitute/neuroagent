/**
 * Tests for Contribution Tools
 *
 * Tests the ContributionGetAllTool and ContributionGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { ContributionGetAllTool } from '../contribution-getall';
import { ContributionGetOneTool } from '../contribution-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Contribution Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('ContributionGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(ContributionGetAllTool.toolName).toBe('entitycore-contribution-getall');
      expect(ContributionGetAllTool.toolNameFrontend).toBe('Get All Contributions');
      expect(ContributionGetAllTool.toolDescription).toContain('knowledge graph');
      expect(ContributionGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(ContributionGetAllTool.toolUtterances.length).toBeGreaterThan(0);
      expect(ContributionGetAllTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ContributionGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        page: 1,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(5);
      expect(result.order_by).toEqual(['-creation_date']);
    });

    it('should support agent filtering', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);

      const validInput = {
        agent__pref_label: 'John Doe',
        agent__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should support entity filtering', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);

      const validInput = {
        entity__id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should support date range filtering', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);

      const validInput = {
        creation_date__gte: '2024-01-01T00:00:00Z',
        creation_date__lte: '2024-12-31T23:59:59Z',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ContributionGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('ContributionGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(ContributionGetOneTool.toolName).toBe('entitycore-contribution-getone');
      expect(ContributionGetOneTool.toolNameFrontend).toBe('Get One Contribution');
      expect(ContributionGetOneTool.toolDescription).toContain('specific contribution');
      expect(ContributionGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(ContributionGetOneTool.toolUtterances.length).toBeGreaterThan(0);
      expect(ContributionGetOneTool.toolHil).toBe(false);
    });

    it('should instantiate with context variables', () => {
      const tool = new ContributionGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(ContributionGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new ContributionGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        contribution_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new ContributionGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        contribution_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require contribution_id', () => {
      const tool = new ContributionGetOneTool(mockContextVariables);

      // Test missing contribution_id
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new ContributionGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(ContributionGetAllTool.toolName).not.toBe(ContributionGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(ContributionGetAllTool.toolName).toMatch(/^entitycore-contribution-/);
      expect(ContributionGetOneTool.toolName).toMatch(/^entitycore-contribution-/);
    });

    it('should match Python tool names', () => {
      // Verify that tool names match the Python implementation
      expect(ContributionGetAllTool.toolName).toBe('entitycore-contribution-getall');
      expect(ContributionGetOneTool.toolName).toBe('entitycore-contribution-getone');
    });
  });
});
