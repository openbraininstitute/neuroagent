/**
 * Tests for OBI-One Circuit Metric tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitMetricGetOneTool } from '../circuit-metric-getone';
import type { ObiOneContextVariables } from '../types';

describe('CircuitMetricGetOneTool', () => {
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

  describe('CircuitMetricGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(CircuitMetricGetOneTool.toolName).toBe('obione-circuitmetrics-getone');
      expect(CircuitMetricGetOneTool.toolNameFrontend).toBe('Compute Circuit Metrics');
      expect(CircuitMetricGetOneTool.toolDescription).toContain(
        'Given a circuit ID, compute the features of it'
      );
      expect(CircuitMetricGetOneTool.utterances).toContain(
        'Analyze the circuit features'
      );
    });

    it('should execute successfully with valid input', async () => {
      const mockResponse = {
        number_of_biophys_node_populations: 1,
        number_of_virtual_node_populations: 0,
        names_of_biophys_node_populations: ['neurons'],
        names_of_virtual_node_populations: [],
        names_of_nodesets: ['Excitatory', 'Inhibitory'],
        biophysical_node_populations: [
          {
            name: 'neurons',
            number_of_nodes: 1000,
            population_type: 'biophysical',
            property_names: ['layer', 'mtype'],
            property_unique_values: {
              layer: ['2', '3', '4', '5', '6'],
              mtype: ['L2/3PC', 'L5PC'],
            },
            property_value_counts: {
              layer: { '2': 100, '3': 200, '4': 200, '5': 300, '6': 200 },
              mtype: { 'L2/3PC': 300, L5PC: 700 },
            },
            node_location_info: null,
          },
        ],
        virtual_node_populations: [],
        number_of_chemical_edge_populations: 1,
        number_of_electrical_edge_populations: 0,
        names_of_chemical_edge_populations: ['neurons__neurons__chemical'],
        names_of_electrical_edge_populations: [],
        chemical_edge_populations: [
          {
            name: 'neurons__neurons__chemical',
            number_of_edges: 50000,
            population_type: 'chemical',
            property_names: ['conductance', 'delay'],
            property_stats: null,
            degree_stats: null,
          },
        ],
        electrical_edge_populations: [],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new CircuitMetricGetOneTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        level_of_detail_nodes: 1,
        level_of_detail_edges: 1,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {
            virtual_lab_id: '123e4567-e89b-12d3-a456-426614174000',
            project_id: '123e4567-e89b-12d3-a456-426614174001',
          },
          searchParams: expect.any(URLSearchParams),
        }
      );

      expect(result).toEqual(mockResponse);
      expect(result.number_of_biophys_node_populations).toBe(1);
      expect(result.biophysical_node_populations).toHaveLength(1);
    });

    it('should execute with default level of detail', async () => {
      const mockResponse = {
        number_of_biophys_node_populations: 1,
        number_of_virtual_node_populations: 0,
        names_of_biophys_node_populations: ['neurons'],
        names_of_virtual_node_populations: [],
        names_of_nodesets: [],
        biophysical_node_populations: [
          {
            name: 'neurons',
            number_of_nodes: 1000,
            population_type: 'biophysical',
            property_names: [],
            property_unique_values: {},
            property_value_counts: {},
            node_location_info: null,
          },
        ],
        virtual_node_populations: [],
        number_of_chemical_edge_populations: 0,
        number_of_electrical_edge_populations: 0,
        names_of_chemical_edge_populations: [],
        names_of_electrical_edge_populations: [],
        chemical_edge_populations: [],
        electrical_edge_populations: [],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const tool = new CircuitMetricGetOneTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit-metrics/123e4567-e89b-12d3-a456-426614174002',
        {
          headers: {
            virtual_lab_id: '123e4567-e89b-12d3-a456-426614174000',
            project_id: '123e4567-e89b-12d3-a456-426614174001',
          },
          searchParams: expect.any(URLSearchParams),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should execute without vlab and project headers', async () => {
      const mockResponse = {
        number_of_biophys_node_populations: 0,
        number_of_virtual_node_populations: 0,
        names_of_biophys_node_populations: [],
        names_of_virtual_node_populations: [],
        names_of_nodesets: [],
        biophysical_node_populations: [],
        virtual_node_populations: [],
        number_of_chemical_edge_populations: 0,
        number_of_electrical_edge_populations: 0,
        names_of_chemical_edge_populations: [],
        names_of_electrical_edge_populations: [],
        chemical_edge_populations: [],
        electrical_edge_populations: [],
      };

      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const contextWithoutIds: ObiOneContextVariables = {
        httpClient: mockHttpClient,
        obiOneUrl: 'https://api.example.com',
      };

      const tool = new CircuitMetricGetOneTool(contextWithoutIds);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        level_of_detail_nodes: 2,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit-metrics/123e4567-e89b-12d3-a456-426614174002',
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

      const tool = new CircuitMetricGetOneTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        })
      ).rejects.toThrow('API Error');
    });

    it('should validate level_of_detail_nodes constraints', () => {
      const tool = new CircuitMetricGetOneTool(contextVariables);

      // Valid values (0-3)
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_nodes: 0,
        })
      ).not.toThrow();

      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_nodes: 3,
        })
      ).not.toThrow();

      // Invalid values
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_nodes: -1,
        })
      ).toThrow();

      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_nodes: 4,
        })
      ).toThrow();
    });

    it('should validate level_of_detail_edges constraints', () => {
      const tool = new CircuitMetricGetOneTool(contextVariables);

      // Valid values (0-3)
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_edges: 0,
        })
      ).not.toThrow();

      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_edges: 3,
        })
      ).not.toThrow();

      // Invalid values
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_edges: -1,
        })
      ).toThrow();

      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          level_of_detail_edges: 4,
        })
      ).toThrow();
    });
  });

  describe('isOnline', () => {
    it('should return true when health check succeeds', async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const result = await CircuitMetricGetOneTool.isOnline(contextVariables);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/health'
      );
    });

    it('should return false when health check fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const result = await CircuitMetricGetOneTool.isOnline(contextVariables);

      expect(result).toBe(false);
    });
  });
});
