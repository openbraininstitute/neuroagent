/**
 * Tests for OBI-One Circuit Population tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitPopulationGetOneTool } from '../circuit-population-getone';
import type { ObiOneContextVariables } from '../types';

describe('CircuitPopulationGetOneTool', () => {
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

  describe('CircuitPopulationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(CircuitPopulationGetOneTool.toolName).toBe(
        'obione-circuitpopulation-getone'
      );
      expect(CircuitPopulationGetOneTool.toolNameFrontend).toBe('Get Circuit Population');
      expect(CircuitPopulationGetOneTool.toolDescription).toContain(
        'Given a circuit ID, retrieve the population of it'
      );
      expect(CircuitPopulationGetOneTool.utterances).toContain(
        'Get the circuit population'
      );
    });

    it('should execute successfully with valid input', async () => {
      const mockResponse = {
        populations: ['neurons', 'glia', 'interneurons'],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new CircuitPopulationGetOneTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit/123e4567-e89b-12d3-a456-426614174002/biophysical_populations',
        {
          headers: {
            virtual_lab_id: '123e4567-e89b-12d3-a456-426614174000',
            project_id: '123e4567-e89b-12d3-a456-426614174001',
          },
        }
      );

      expect(result).toEqual(mockResponse);
      expect(result.populations).toHaveLength(3);
      expect(result.populations).toContain('neurons');
    });

    it('should execute without vlab and project headers', async () => {
      const mockResponse = {
        populations: ['all_cells'],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const contextWithoutIds: ObiOneContextVariables = {
        httpClient: mockHttpClient,
        obiOneUrl: 'https://api.example.com',
      };

      const tool = new CircuitPopulationGetOneTool(contextWithoutIds);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit/123e4567-e89b-12d3-a456-426614174002/biophysical_populations',
        {
          headers: {},
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on API failure', async () => {
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockRejectedValue(new Error('API Error')),
      });

      const tool = new CircuitPopulationGetOneTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).rejects.toThrow('API Error');
    });

    it('should validate circuit_id is a valid UUID', () => {
      const tool = new CircuitPopulationGetOneTool(contextVariables);

      // Valid UUID
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).not.toThrow();

      // Invalid UUID
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: 'not-a-uuid',
        })
      ).toThrow();
    });

    it('should handle empty populations response', async () => {
      const mockResponse = {
        populations: [],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new CircuitPopulationGetOneTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(result.populations).toHaveLength(0);
    });
  });

  describe('isOnline', () => {
    it('should return true when health check succeeds', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const result = await CircuitPopulationGetOneTool.isOnline(contextVariables);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith('https://api.example.com/health');
    });

    it('should return false when health check fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await CircuitPopulationGetOneTool.isOnline(contextVariables);

      expect(result).toBe(false);
    });
  });
});
