/**
 * Tests for Thumbnail Generation tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlotElectricalCellRecordingGetOneTool } from '../plot-electrical-cell-recording-getone';
import { PlotMorphologyGetOneTool } from '../plot-morphology-getone';
import { ThumbnailGenerationContextVariables } from '../types';
import { S3Client } from '@aws-sdk/client-s3';

describe('Thumbnail Generation Tools', () => {
  let mockContextVariables: ThumbnailGenerationContextVariables;
  let mockHttpClient: any;
  let mockS3Client: S3Client;

  beforeEach(() => {
    // Mock HTTP client
    mockHttpClient = {
      get: vi.fn(),
    };

    // Mock S3 client
    mockS3Client = {
      send: vi.fn().mockResolvedValue({}),
    } as any;

    // Setup context variables
    mockContextVariables = {
      httpClient: mockHttpClient,
      thumbnailGenerationUrl: 'https://api.example.com/thumbnail-generation',
      entitycoreUrl: 'https://api.example.com/entitycore',
      s3Client: mockS3Client,
      userId: 'user-123',
      bucketName: 'test-bucket',
      threadId: 'thread-456',
      vlabId: 'vlab-789',
      projectId: 'project-abc',
    };
  });

  describe('PlotElectricalCellRecordingGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(PlotElectricalCellRecordingGetOneTool.toolName).toBe(
        'thumbnail-generation-electricalcellrecording-getone'
      );
      expect(PlotElectricalCellRecordingGetOneTool.toolNameFrontend).toBe(
        'Get Electrical Cell Recording Thumbnail'
      );
      expect(
        PlotElectricalCellRecordingGetOneTool.toolUtterances
      ).toContain('Generate a thumbnail for this trace');
    });

    it('should generate thumbnail for electrical cell recording', async () => {
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const assetId = '987fcdeb-51a2-43f7-b123-456789abcdef';

      // Mock EntityCore response
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              assets: [
                {
                  id: assetId,
                  content_type: 'application/nwb',
                },
              ],
            }),
        })
      );

      // Mock thumbnail generation response
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        })
      );

      const tool = new PlotElectricalCellRecordingGetOneTool(
        mockContextVariables
      );
      const result = await tool.execute({ entity_id: entityId });

      expect(result).toHaveProperty('storage_id');
      expect(typeof result.storage_id).toBe('string');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should throw error if no NWB asset found', async () => {
      const entityId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock EntityCore response with no NWB asset
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              assets: [
                {
                  id: 'some-id',
                  content_type: 'application/other',
                },
              ],
            }),
        })
      );

      const tool = new PlotElectricalCellRecordingGetOneTool(
        mockContextVariables
      );

      await expect(tool.execute({ entity_id: entityId })).rejects.toThrow(
        'No NWB asset found'
      );
    });

    it('should check if service is online', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const isOnline = await PlotElectricalCellRecordingGetOneTool.isOnline(
        mockContextVariables
      );

      expect(isOnline).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/thumbnail-generation/health'
      );
    });

    it('should return false if service is offline', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Service unavailable'));

      const isOnline = await PlotElectricalCellRecordingGetOneTool.isOnline(
        mockContextVariables
      );

      expect(isOnline).toBe(false);
    });
  });

  describe('PlotMorphologyGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(PlotMorphologyGetOneTool.toolName).toBe(
        'thumbnail-generation-morphology-getone'
      );
      expect(PlotMorphologyGetOneTool.toolNameFrontend).toBe(
        'Get Morphology Thumbnail'
      );
      expect(PlotMorphologyGetOneTool.toolUtterances).toContain(
        'Generate a thumbnail for this morphology'
      );
    });

    it('should generate thumbnail for morphology', async () => {
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const assetId = '987fcdeb-51a2-43f7-b123-456789abcdef';

      // Mock EntityCore response
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              assets: [
                {
                  id: assetId,
                  content_type: 'application/swc',
                },
              ],
            }),
        })
      );

      // Mock thumbnail generation response
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        })
      );

      const tool = new PlotMorphologyGetOneTool(mockContextVariables);
      const result = await tool.execute({ entity_id: entityId });

      expect(result).toHaveProperty('storage_id');
      expect(typeof result.storage_id).toBe('string');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should throw error if no SWC asset found', async () => {
      const entityId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock EntityCore response with no SWC asset
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              assets: [
                {
                  id: 'some-id',
                  content_type: 'application/other',
                },
              ],
            }),
        })
      );

      const tool = new PlotMorphologyGetOneTool(mockContextVariables);

      await expect(tool.execute({ entity_id: entityId })).rejects.toThrow(
        'No SWC asset found'
      );
    });

    it('should include optional dpi parameter', async () => {
      const entityId = '123e4567-e89b-12d3-a456-426614174000';
      const assetId = '987fcdeb-51a2-43f7-b123-456789abcdef';
      const dpi = 300;

      // Mock EntityCore response
      mockHttpClient.get.mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              assets: [
                {
                  id: assetId,
                  content_type: 'application/swc',
                },
              ],
            }),
        })
      );

      // Mock thumbnail generation response
      mockHttpClient.get.mockImplementationOnce((_url: string, options: any) => {
        expect(options.searchParams.dpi).toBe('300');
        return Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });
      });

      const tool = new PlotMorphologyGetOneTool(mockContextVariables);
      await tool.execute({ entity_id: entityId, dpi });
    });

    it('should check if service is online', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const isOnline =
        await PlotMorphologyGetOneTool.isOnline(mockContextVariables);

      expect(isOnline).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/thumbnail-generation/health'
      );
    });

    it('should return false if service is offline', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Service unavailable'));

      const isOnline =
        await PlotMorphologyGetOneTool.isOnline(mockContextVariables);

      expect(isOnline).toBe(false);
    });
  });
});
