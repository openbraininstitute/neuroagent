/**
 * Tests for OBI-One Morphometrics tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorphometricsGetOneTool } from '../morphometrics-getone';
import type { ObiOneContextVariables } from '../types';

describe('MorphometricsGetOneTool', () => {
  let mockHttpClient: any;
  let contextVariables: ObiOneContextVariables;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
    };

    contextVariables = {
      httpClient: mockHttpClient,
      obiOneUrl: 'https://api.example.com',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
    };
  });

  describe('MorphometricsGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(MorphometricsGetOneTool.toolName).toBe('obione-morphometrics-getone');
      expect(MorphometricsGetOneTool.toolNameFrontend).toBe('Compute Morphology Metrics');
      expect(MorphometricsGetOneTool.toolDescription).toContain(
        'Given a morphology ID, fetch data about the features of the morphology'
      );
      expect(MorphometricsGetOneTool.utterances).toContain(
        'Analyze morphological features'
      );
    });

    it('should execute successfully with valid input', async () => {
      const mockResponse = {
        aspect_ratio: 1.5,
        total_length: 5000.0,
        total_area: 2500.0,
        total_volume: 1200.0,
        number_of_sections: 50,
        soma_surface_area: 150.0,
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new MorphometricsGetOneTool(contextVariables);
      const result = await tool.execute({
        cell_morphology_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/neuron-morphology-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {
            'virtual-lab-id': '123e4567-e89b-12d3-a456-426614174000',
            'project-id': '123e4567-e89b-12d3-a456-426614174001',
          },
          searchParams: expect.any(URLSearchParams),
        }
      );

      expect(result).toEqual(mockResponse);
      expect(result.aspect_ratio).toBe(1.5);
    });

    it('should execute with query parameters', async () => {
      const mockResponse = {
        aspect_ratio: 1.2,
        total_length: 3000.0,
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new MorphometricsGetOneTool(contextVariables);
      const result = await tool.execute({
        cell_morphology_id: '123e4567-e89b-12d3-a456-426614174002',
        neurite_type: 'basal_dendrite',
      } as any);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/neuron-morphology-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {
            'virtual-lab-id': '123e4567-e89b-12d3-a456-426614174000',
            'project-id': '123e4567-e89b-12d3-a456-426614174001',
          },
          searchParams: expect.any(URLSearchParams),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should execute without vlab and project headers', async () => {
      const mockResponse = {
        aspect_ratio: 1.0,
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const contextWithoutIds: ObiOneContextVariables = {
        httpClient: mockHttpClient,
        obiOneUrl: 'https://api.example.com',
      };

      const tool = new MorphometricsGetOneTool(contextWithoutIds);
      const result = await tool.execute({
        cell_morphology_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/neuron-morphology-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {},
          searchParams: expect.any(URLSearchParams),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on API failure', async () => {
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockRejectedValue(new Error('API Error')),
      });

      const tool = new MorphometricsGetOneTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).rejects.toThrow('API Error');
    });

    it('should validate cell_morphology_id is a valid UUID', () => {
      const tool = new MorphometricsGetOneTool(contextVariables);

      // Valid UUID
      expect(() =>
        tool.inputSchema.parse({
          cell_morphology_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).not.toThrow();

      // Invalid UUID
      expect(() =>
        tool.inputSchema.parse({
          cell_morphology_id: 'not-a-uuid',
        })
      ).toThrow();
    });

    it('should handle minimal response', async () => {
      const mockResponse = {
        aspect_ratio: null,
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new MorphometricsGetOneTool(contextVariables);
      const result = await tool.execute({
        cell_morphology_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(result.aspect_ratio).toBeNull();
    });
  });

  describe('isOnline', () => {
    it('should return true when health check succeeds', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const result = await MorphometricsGetOneTool.isOnline(contextVariables);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith('https://api.example.com/health');
    });

    it('should return false when health check fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await MorphometricsGetOneTool.isOnline(contextVariables);

      expect(result).toBe(false);
    });
  });
});
