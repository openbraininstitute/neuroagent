/**
 * Tests for Ion Channel Tools
 *
 * Tests the IonChannelGetAllTool and IonChannelGetOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { IonChannelGetAllTool } from '../ion-channel-getall';
import { IonChannelGetOneTool } from '../ion-channel-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Ion Channel Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('IonChannelGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(IonChannelGetAllTool.toolName).toBe('entitycore-ionchannel-getall');
      expect(IonChannelGetAllTool.toolNameFrontend).toBe('Get All Ion Channels');
      expect(IonChannelGetAllTool.toolDescription).toContain('ion-channels');
      expect(IonChannelGetAllTool.toolUtterances).toBeInstanceOf(Array);
    });

    it('should instantiate with context variables', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(IonChannelGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        page_size: 5,
        page: 1,
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate page_size constraints', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);

      // Test page_size too large
      const invalidInput = {
        page_size: 20, // Max is 10
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate page_size minimum', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);

      // Test page_size too small
      const invalidInput = {
        page_size: 0, // Min is 1
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have default page_size of 5', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);

      const result = tool.inputSchema.parse({});
      expect(result.page_size).toBe(5);
    });

    it('should accept optional filter parameters', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);

      // Test with label filter
      const inputWithLabel = {
        label: 'Kv1.1',
      };
      const resultWithLabel = tool.inputSchema.safeParse(inputWithLabel);
      expect(resultWithLabel.success).toBe(true);

      // Test with gene filter
      const inputWithGene = {
        gene: 'KCNA1',
      };
      const resultWithGene = tool.inputSchema.safeParse(inputWithGene);
      expect(resultWithGene.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new IonChannelGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should have frontend description', () => {
      expect(IonChannelGetAllTool.toolDescriptionFrontend).toContain('ion-channels');
      expect(IonChannelGetAllTool.toolDescriptionFrontend).toContain('criteria');
    });
  });

  describe('IonChannelGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(IonChannelGetOneTool.toolName).toBe('entitycore-ionchannel-getone');
      expect(IonChannelGetOneTool.toolNameFrontend).toBe('Get One Ion Channel');
      expect(IonChannelGetOneTool.toolDescription).toContain('specific ion-channel');
      expect(IonChannelGetOneTool.toolUtterances).toBeInstanceOf(Array);
    });

    it('should instantiate with context variables', () => {
      const tool = new IonChannelGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(IonChannelGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new IonChannelGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        ion_channel_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new IonChannelGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        ion_channel_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require ion_channel_id', () => {
      const tool = new IonChannelGetOneTool(mockContextVariables);

      // Test missing ion_channel_id
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new IonChannelGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should have frontend description', () => {
      expect(IonChannelGetOneTool.toolDescriptionFrontend).toContain('ion-channel');
      expect(IonChannelGetOneTool.toolDescriptionFrontend).toContain('details');
    });

    it('should describe required input in schema', () => {
      const tool = new IonChannelGetOneTool(mockContextVariables);
      const schema = tool.inputSchema;

      // Check that the schema has a description for ion_channel_id
      const parsed = schema.safeParse({
        ion_channel_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      expect(IonChannelGetAllTool.toolName).not.toBe(IonChannelGetOneTool.toolName);
    });

    it('should have consistent naming pattern', () => {
      expect(IonChannelGetAllTool.toolName).toMatch(/^entitycore-ionchannel-/);
      expect(IonChannelGetOneTool.toolName).toMatch(/^entitycore-ionchannel-/);
    });

    it('should follow entitycore naming convention', () => {
      expect(IonChannelGetAllTool.toolName).toContain('entitycore');
      expect(IonChannelGetOneTool.toolName).toContain('entitycore');
    });
  });

  describe('Tool Metadata Consistency', () => {
    it('should have matching tool name patterns', () => {
      const getAllName = IonChannelGetAllTool.toolName;
      const getOneName = IonChannelGetOneTool.toolName;

      // Both should start with the same prefix
      const prefix = 'entitycore-ionchannel-';
      expect(getAllName.startsWith(prefix)).toBe(true);
      expect(getOneName.startsWith(prefix)).toBe(true);

      // GetAll should end with 'getall'
      expect(getAllName.endsWith('getall')).toBe(true);

      // GetOne should end with 'getone'
      expect(getOneName.endsWith('getone')).toBe(true);
    });

    it('should have non-empty descriptions', () => {
      expect(IonChannelGetAllTool.toolDescription.length).toBeGreaterThan(0);
      expect(IonChannelGetOneTool.toolDescription.length).toBeGreaterThan(0);
      expect(IonChannelGetAllTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
      expect(IonChannelGetOneTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
    });
  });
});
