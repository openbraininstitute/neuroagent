/**
 * Tests for OBI-One Circuit Nodesets tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitNodesetsGetOneTool } from '../circuit-nodesets-getone';
import type { ObiOneContextVariables } from '../circuit-nodesets-getone';

describe('CircuitNodesetsGetOneTool', () => {
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

  describe('CircuitNodesetsGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(CircuitNodesetsGetOneTool.toolName).toBe('obione-circuitnodesets-getone');
      expect(CircuitNodesetsGetOneTool.toolNameFrontend).toBe('Get Circuit Nodesets');
      expect(CircuitNodesetsGetOneTool.toolDescription).toContain(
        'Given a circuit ID, retrieve the nodesets of it'
      );
      expect(CircuitNodesetsGetOneTool.utterances).toContain(
        'Get the circuit nodesets'
      );
    });

    it('should execute successfully with valid input', async () => {
      const mockResponse = {
        nodesets: ['Excitatory', 'Inhibitory', 'Layer1', 'Layer2', 'Layer3'],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new CircuitNodesetsGetOneTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit/123e4567-e89b-12d3-a456-426614174002/nodesets',
        {
          headers: {
            virtual_lab_id: '123e4567-e89b-12d3-a456-426614174000',
            project_id: '123e4567-e89b-12d3-a456-426614174001',
          },
        }
      );

      expect(result).toEqual(mockResponse);
      expect(result.nodesets).toHaveLength(5);
      expect(result.nodesets).toContain('Excitatory');
    });

    it('should execute without vlab and project headers', async () => {
      const mockResponse = {
        nodesets: ['All'],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const contextWithoutIds: ObiOneContextVariables = {
        httpClient: mockHttpClient,
        obiOneUrl: 'https://api.example.com',
      };

      const tool = new CircuitNodesetsGetOneTool(contextWithoutIds);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit/123e4567-e89b-12d3-a456-426614174002/nodesets',
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

      const tool = new CircuitNodesetsGetOneTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).rejects.toThrow(
        'The circuit nodesets endpoint returned a non 200 response code. Error: API Error'
      );
    });

    it('should validate circuit_id is a valid UUID', () => {
      const tool = new CircuitNodesetsGetOneTool(contextVariables);

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

    it('should handle empty nodesets response', async () => {
      const mockResponse = {
        nodesets: [],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new CircuitNodesetsGetOneTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(result.nodesets).toHaveLength(0);
    });
  });

  describe('isOnline', () => {
    it('should return true when health check succeeds', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const result = await CircuitNodesetsGetOneTool.isOnline(contextVariables);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/health'
      );
    });

    it('should return false when health check fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await CircuitNodesetsGetOneTool.isOnline(contextVariables);

      expect(result).toBe(false);
    });
  });
});
