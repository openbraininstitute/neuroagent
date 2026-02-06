/**
 * Tests for OBI-One Electrophysiology Metrics tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EphysMetricsGetOneTool } from '../ephys-metrics-getone';
import type { ObiOneContextVariables } from '../ephys-metrics-getone';

describe('EphysMetricsGetOneTool', () => {
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

  describe('EphysMetricsGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(EphysMetricsGetOneTool.toolName).toBe('obione-ephysmetrics-getone');
      expect(EphysMetricsGetOneTool.toolNameFrontend).toBe(
        'Compute Electrophysiology Metrics'
      );
      expect(EphysMetricsGetOneTool.toolDescription).toContain(
        'Given an electrical cell recording ID, fetch data about the electrophysiological features'
      );
      expect(EphysMetricsGetOneTool.utterances).toContain(
        'Analyze electrophysiological features'
      );
    });

    it('should execute successfully with valid input', async () => {
      const mockResponse = {
        feature_dict: {
          step_protocol: {
            spike_count: 10,
            mean_frequency: 50.5,
            adaptation_index: 0.8,
          },
          ramp_protocol: {
            spike_count: 15,
            mean_frequency: 45.2,
          },
        },
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new EphysMetricsGetOneTool(contextVariables);
      const result = await tool.execute({
        trace_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/electrophysiologyrecording-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {
            virtual_lab_id: '123e4567-e89b-12d3-a456-426614174000',
            project_id: '123e4567-e89b-12d3-a456-426614174001',
          },
          searchParams: {},
        }
      );

      expect(result).toEqual(mockResponse);
      expect(result.feature_dict).toHaveProperty('step_protocol');
    });

    it('should execute with query parameters', async () => {
      const mockResponse = {
        feature_dict: {
          step_protocol: {
            spike_count: 5,
          },
        },
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new EphysMetricsGetOneTool(contextVariables);
      const result = await tool.execute({
        trace_id: '123e4567-e89b-12d3-a456-426614174002',
        protocols: ['step'],
        current_min: 0.1,
        current_max: 0.3,
      } as any);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/electrophysiologyrecording-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {
            virtual_lab_id: '123e4567-e89b-12d3-a456-426614174000',
            project_id: '123e4567-e89b-12d3-a456-426614174001',
          },
          searchParams: {
            protocols: ['step'],
            current_min: 0.1,
            current_max: 0.3,
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should execute without vlab and project headers', async () => {
      const mockResponse = {
        feature_dict: {},
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const contextWithoutIds: ObiOneContextVariables = {
        httpClient: mockHttpClient,
        obiOneUrl: 'https://api.example.com',
      };

      const tool = new EphysMetricsGetOneTool(contextWithoutIds);
      const result = await tool.execute({
        trace_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/electrophysiologyrecording-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {},
          searchParams: {},
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on API failure', async () => {
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockRejectedValue(new Error('API Error')),
      });

      const tool = new EphysMetricsGetOneTool(contextVariables);

      await expect(
        tool.execute({
          trace_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).rejects.toThrow(
        'The electrophysiology metrics endpoint returned a non 200 response code. Error: API Error'
      );
    });

    it('should validate trace_id is a valid UUID', () => {
      const tool = new EphysMetricsGetOneTool(contextVariables);

      // Valid UUID
      expect(() =>
        tool.inputSchema.parse({
          trace_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).not.toThrow();

      // Invalid UUID
      expect(() =>
        tool.inputSchema.parse({
          trace_id: 'not-a-uuid',
        })
      ).toThrow();
    });

    it('should handle empty feature_dict response', async () => {
      const mockResponse = {
        feature_dict: {},
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new EphysMetricsGetOneTool(contextVariables);
      const result = await tool.execute({
        trace_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(result.feature_dict).toEqual({});
    });
  });

  describe('isOnline', () => {
    it('should return true when health check succeeds', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const result = await EphysMetricsGetOneTool.isOnline(contextVariables);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith('https://api.example.com/health');
    });

    it('should return false when health check fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await EphysMetricsGetOneTool.isOnline(contextVariables);

      expect(result).toBe(false);
    });
  });
});
