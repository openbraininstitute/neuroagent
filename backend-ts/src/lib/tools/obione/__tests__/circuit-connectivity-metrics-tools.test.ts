/**
 * Tests for Circuit Connectivity Metrics Tool
 *
 * Tests the CircuitConnectivityMetricsGetOneTool implementation.
 */

import { describe, it, expect } from 'vitest';
import { CircuitConnectivityMetricsGetOneTool } from '../circuit-connectivity-metrics-getone';
import type { ObiOneContextVariables } from '../types';

describe('Circuit Connectivity Metrics Tool', () => {
  const mockContextVariables: ObiOneContextVariables = {
    httpClient: null as any,
    obiOneUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
  };

  describe('CircuitConnectivityMetricsGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(CircuitConnectivityMetricsGetOneTool.toolName).toBe(
        'obione-circuitconnectivitymetrics-getone'
      );
      expect(CircuitConnectivityMetricsGetOneTool.toolNameFrontend).toBe(
        'Compute Circuit Connectivity Metrics'
      );
      expect(CircuitConnectivityMetricsGetOneTool.toolDescription).toContain(
        'connectivity patterns'
      );
      expect(CircuitConnectivityMetricsGetOneTool.utterances).toBeInstanceOf(Array);
      expect(CircuitConnectivityMetricsGetOneTool.utterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new CircuitConnectivityMetricsGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(CircuitConnectivityMetricsGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new CircuitConnectivityMetricsGetOneTool(mockContextVariables);

      // Test valid input
      const validInput = {
        circuit_id: '123e4567-e89b-12d3-a456-426614174000',
        edge_population: 'S1nonbarrel_neurons__S1nonbarrel_neurons__chemical',
        pre_node_set: 'Excitatory',
        post_node_set: 'Inhibitory',
        group_by: 'mtype',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate circuit_id as UUID', () => {
      const tool = new CircuitConnectivityMetricsGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        circuit_id: 'not-a-uuid',
        edge_population: 'test',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept optional pre_selection and post_selection', () => {
      const tool = new CircuitConnectivityMetricsGetOneTool(mockContextVariables);

      const validInput = {
        circuit_id: '123e4567-e89b-12d3-a456-426614174000',
        edge_population: 'test',
        pre_selection: { mtype: 'L2/3PC' },
        post_selection: { layer: ['2', '3', '4'] },
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new CircuitConnectivityMetricsGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });
});
