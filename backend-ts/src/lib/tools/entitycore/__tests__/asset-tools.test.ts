/**
 * Tests for Asset Tools
 *
 * Tests the AssetGetAllTool, AssetGetOneTool, and AssetDownloadOneTool implementations.
 */

import { describe, it, expect } from 'vitest';
import { AssetGetAllTool } from '../asset-getall';
import { AssetGetOneTool } from '../asset-getone';
import { AssetDownloadOneTool } from '../asset-downloadone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Asset Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('AssetGetAllTool', () => {
    it('should have correct metadata', () => {
      expect(AssetGetAllTool.toolName).toBe('entitycore-asset-getall');
      expect(AssetGetAllTool.toolNameFrontend).toBe('Get All Assets');
      expect(AssetGetAllTool.toolDescription).toContain('assets');
      expect(AssetGetAllTool.toolUtterances).toBeInstanceOf(Array);
      expect(AssetGetAllTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new AssetGetAllTool(mockContextVariables);
      expect(tool).toBeInstanceOf(AssetGetAllTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new AssetGetAllTool(mockContextVariables);

      // Test valid input
      const validInput = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate entity_route enum', () => {
      const tool = new AssetGetAllTool(mockContextVariables);

      // Test invalid entity_route
      const invalidInput = {
        entity_route: 'invalid-route',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate entity_id UUID format', () => {
      const tool = new AssetGetAllTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        entity_route: 'brain-atlas',
        entity_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require both entity_route and entity_id', () => {
      const tool = new AssetGetAllTool(mockContextVariables);

      // Test missing entity_route
      const missingRoute = {
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(tool.inputSchema.safeParse(missingRoute).success).toBe(false);

      // Test missing entity_id
      const missingId = {
        entity_route: 'brain-atlas',
      };
      expect(tool.inputSchema.safeParse(missingId).success).toBe(false);
    });

    it('should accept valid entity routes', () => {
      const tool = new AssetGetAllTool(mockContextVariables);

      const validRoutes = [
        'brain-atlas',
        'brain-atlas-region',
        'cell-morphology',
        'circuit',
        'emodel',
      ];

      validRoutes.forEach((route) => {
        const input = {
          entity_route: route,
          entity_id: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = tool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should convert to Vercel tool format', () => {
      const tool = new AssetGetAllTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should include correct utterances', () => {
      const utterances = AssetGetAllTool.toolUtterances;
      expect(utterances).toContain('List all files for this entity');
      expect(utterances).toContain('Show me all assets');
      expect(utterances).toContain('What assets are available?');
    });

    it('should have frontend description', () => {
      expect(AssetGetAllTool.toolDescriptionFrontend).toContain('assets');
      expect(AssetGetAllTool.toolDescriptionFrontend).toContain('entity');
    });
  });

  describe('AssetGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(AssetGetOneTool.toolName).toBe('entitycore-asset-getone');
      expect(AssetGetOneTool.toolNameFrontend).toBe('Get One Asset');
      expect(AssetGetOneTool.toolDescription).toContain('single asset');
      expect(AssetGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(AssetGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new AssetGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(AssetGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new AssetGetOneTool(mockContextVariables);

      // Test valid input
      const validInput = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate entity_route enum', () => {
      const tool = new AssetGetOneTool(mockContextVariables);

      // Test invalid entity_route
      const invalidInput = {
        entity_route: 'invalid-route',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate UUID formats', () => {
      const tool = new AssetGetOneTool(mockContextVariables);

      // Test invalid entity_id
      const invalidEntityId = {
        entity_route: 'brain-atlas',
        entity_id: 'not-a-uuid',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(tool.inputSchema.safeParse(invalidEntityId).success).toBe(false);

      // Test invalid asset_id
      const invalidAssetId = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: 'not-a-uuid',
      };
      expect(tool.inputSchema.safeParse(invalidAssetId).success).toBe(false);
    });

    it('should require all three parameters', () => {
      const tool = new AssetGetOneTool(mockContextVariables);

      // Test missing entity_route
      const missingRoute = {
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(tool.inputSchema.safeParse(missingRoute).success).toBe(false);

      // Test missing entity_id
      const missingEntityId = {
        entity_route: 'brain-atlas',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(tool.inputSchema.safeParse(missingEntityId).success).toBe(false);

      // Test missing asset_id
      const missingAssetId = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(tool.inputSchema.safeParse(missingAssetId).success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new AssetGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should include correct utterances', () => {
      const utterances = AssetGetOneTool.toolUtterances;
      expect(utterances).toContain('Get details for this asset');
      expect(utterances).toContain('Show me information about this file');
      expect(utterances).toContain('What are the properties of this asset?');
    });

    it('should have frontend description', () => {
      expect(AssetGetOneTool.toolDescriptionFrontend).toContain('asset');
      expect(AssetGetOneTool.toolDescriptionFrontend).toContain('metadata');
    });
  });

  describe('AssetDownloadOneTool', () => {
    it('should have correct metadata', () => {
      expect(AssetDownloadOneTool.toolName).toBe('entitycore-asset-downloadone');
      expect(AssetDownloadOneTool.toolNameFrontend).toBe('Download One Asset');
      expect(AssetDownloadOneTool.toolDescription).toContain('presigned URL');
      expect(AssetDownloadOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(AssetDownloadOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new AssetDownloadOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(AssetDownloadOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new AssetDownloadOneTool(mockContextVariables);

      // Test valid input
      const validInput = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate entity_route enum', () => {
      const tool = new AssetDownloadOneTool(mockContextVariables);

      // Test invalid entity_route
      const invalidInput = {
        entity_route: 'invalid-route',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate UUID formats', () => {
      const tool = new AssetDownloadOneTool(mockContextVariables);

      // Test invalid entity_id
      const invalidEntityId = {
        entity_route: 'brain-atlas',
        entity_id: 'not-a-uuid',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(tool.inputSchema.safeParse(invalidEntityId).success).toBe(false);

      // Test invalid asset_id
      const invalidAssetId = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: 'not-a-uuid',
      };
      expect(tool.inputSchema.safeParse(invalidAssetId).success).toBe(false);
    });

    it('should require all three parameters', () => {
      const tool = new AssetDownloadOneTool(mockContextVariables);

      // Test missing entity_route
      const missingRoute = {
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(tool.inputSchema.safeParse(missingRoute).success).toBe(false);

      // Test missing entity_id
      const missingEntityId = {
        entity_route: 'brain-atlas',
        asset_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(tool.inputSchema.safeParse(missingEntityId).success).toBe(false);

      // Test missing asset_id
      const missingAssetId = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(tool.inputSchema.safeParse(missingAssetId).success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new AssetDownloadOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should include correct utterances', () => {
      const utterances = AssetDownloadOneTool.toolUtterances;
      expect(utterances).toContain('Download this asset');
      expect(utterances).toContain('Get download link for the file');
      expect(utterances).toContain('I need to download this data');
    });

    it('should have frontend description', () => {
      expect(AssetDownloadOneTool.toolDescriptionFrontend).toContain('download');
      expect(AssetDownloadOneTool.toolDescriptionFrontend).toContain('asset');
    });
  });

  describe('Tool Registration', () => {
    it('should have unique tool names', () => {
      const names = [
        AssetGetAllTool.toolName,
        AssetGetOneTool.toolName,
        AssetDownloadOneTool.toolName,
      ];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have consistent naming pattern', () => {
      expect(AssetGetAllTool.toolName).toMatch(/^entitycore-asset-/);
      expect(AssetGetOneTool.toolName).toMatch(/^entitycore-asset-/);
      expect(AssetDownloadOneTool.toolName).toMatch(/^entitycore-asset-/);
    });

    it('should follow entitycore naming convention', () => {
      expect(AssetGetAllTool.toolName).toContain('entitycore');
      expect(AssetGetOneTool.toolName).toContain('entitycore');
      expect(AssetDownloadOneTool.toolName).toContain('entitycore');
    });

    it('should have correct suffixes', () => {
      expect(AssetGetAllTool.toolName.endsWith('getall')).toBe(true);
      expect(AssetGetOneTool.toolName.endsWith('getone')).toBe(true);
      expect(AssetDownloadOneTool.toolName.endsWith('downloadone')).toBe(true);
    });
  });

  describe('Tool Metadata Consistency', () => {
    it('should have matching tool name patterns', () => {
      const getAllName = AssetGetAllTool.toolName;
      const getOneName = AssetGetOneTool.toolName;
      const downloadOneName = AssetDownloadOneTool.toolName;

      // All should start with the same prefix
      const prefix = 'entitycore-asset-';
      expect(getAllName.startsWith(prefix)).toBe(true);
      expect(getOneName.startsWith(prefix)).toBe(true);
      expect(downloadOneName.startsWith(prefix)).toBe(true);
    });

    it('should have non-empty descriptions', () => {
      expect(AssetGetAllTool.toolDescription.length).toBeGreaterThan(0);
      expect(AssetGetOneTool.toolDescription.length).toBeGreaterThan(0);
      expect(AssetDownloadOneTool.toolDescription.length).toBeGreaterThan(0);
      expect(AssetGetAllTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
      expect(AssetGetOneTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
      expect(AssetDownloadOneTool.toolDescriptionFrontend.length).toBeGreaterThan(0);
    });

    it('should have at least one utterance each', () => {
      expect(AssetGetAllTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
      expect(AssetGetOneTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
      expect(AssetDownloadOneTool.toolUtterances.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Input Schema Consistency', () => {
    it('should all accept entity_route parameter', () => {
      const getAllTool = new AssetGetAllTool(mockContextVariables);
      const getOneTool = new AssetGetOneTool(mockContextVariables);
      const downloadOneTool = new AssetDownloadOneTool(mockContextVariables);

      const baseInput = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(getAllTool.inputSchema.safeParse(baseInput).success).toBe(true);
      expect(
        getOneTool.inputSchema.safeParse({
          ...baseInput,
          asset_id: '123e4567-e89b-12d3-a456-426614174002',
        }).success
      ).toBe(true);
      expect(
        downloadOneTool.inputSchema.safeParse({
          ...baseInput,
          asset_id: '123e4567-e89b-12d3-a456-426614174002',
        }).success
      ).toBe(true);
    });

    it('should all accept entity_id parameter', () => {
      const getAllTool = new AssetGetAllTool(mockContextVariables);
      const getOneTool = new AssetGetOneTool(mockContextVariables);
      const downloadOneTool = new AssetDownloadOneTool(mockContextVariables);

      const baseInput = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(getAllTool.inputSchema.safeParse(baseInput).success).toBe(true);
      expect(
        getOneTool.inputSchema.safeParse({
          ...baseInput,
          asset_id: '123e4567-e89b-12d3-a456-426614174002',
        }).success
      ).toBe(true);
      expect(
        downloadOneTool.inputSchema.safeParse({
          ...baseInput,
          asset_id: '123e4567-e89b-12d3-a456-426614174002',
        }).success
      ).toBe(true);
    });

    it('should require asset_id for GetOne and DownloadOne', () => {
      const getOneTool = new AssetGetOneTool(mockContextVariables);
      const downloadOneTool = new AssetDownloadOneTool(mockContextVariables);

      const inputWithoutAssetId = {
        entity_route: 'brain-atlas',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(getOneTool.inputSchema.safeParse(inputWithoutAssetId).success).toBe(false);
      expect(downloadOneTool.inputSchema.safeParse(inputWithoutAssetId).success).toBe(
        false
      );
    });
  });
});
