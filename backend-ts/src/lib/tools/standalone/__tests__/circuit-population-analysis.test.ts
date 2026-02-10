/**
 * Tests for Circuit Population Analysis tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitPopulationAnalysisTool } from '../circuit-population-analysis';
import type { CircuitPopulationAnalysisContextVariables } from '../circuit-population-analysis';

describe('CircuitPopulationAnalysisTool', () => {
  let mockHttpClient: any;
  let contextVariables: CircuitPopulationAnalysisContextVariables;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    contextVariables = {
      httpClient: mockHttpClient,
      entitycoreUrl: 'https://api.example.com',
      openaiApiKey: 'test-openai-key',
      vlabId: 'test-vlab-id',
      projectId: 'test-project-id',
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(CircuitPopulationAnalysisTool.toolName).toBe(
        'circuit-population-data-analysis'
      );
    });

    it('should have correct frontend name', () => {
      expect(CircuitPopulationAnalysisTool.toolNameFrontend).toBe(
        'Analyze Circuit Population'
      );
    });

    it('should have utterances', () => {
      expect(CircuitPopulationAnalysisTool.utterances).toBeInstanceOf(Array);
      expect(CircuitPopulationAnalysisTool.utterances.length).toBeGreaterThan(
        0
      );
    });

    it('should have tool description', () => {
      expect(CircuitPopulationAnalysisTool.toolDescription).toBeTruthy();
      expect(typeof CircuitPopulationAnalysisTool.toolDescription).toBe(
        'string'
      );
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with all fields', () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);
      const input = {
        circuit_id: '123e4567-e89b-12d3-a456-426614174000',
        population_name: 'S1nonbarrel_neurons',
        question: 'What is the most common morphological type?',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with default population_name', () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);
      const input = {
        circuit_id: '123e4567-e89b-12d3-a456-426614174000',
        question: 'How many neurons are there?',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.population_name).toBe('S1nonbarrel_neurons');
      }
    });

    it('should reject input with invalid circuit_id', () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);
      const input = {
        circuit_id: 'not-a-uuid',
        question: 'test question',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input without circuit_id', () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);
      const input = {
        question: 'test question',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject input without question', () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);
      const input = {
        circuit_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should throw not implemented error', async () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174000',
          population_name: 'S1nonbarrel_neurons',
          question: 'What is the most common morphological type?',
        })
      ).rejects.toThrow(
        'Circuit Population Analysis tool requires full implementation'
      );
    });

    it('should include input details in error message', async () => {
      const tool = new CircuitPopulationAnalysisTool(contextVariables);
      const circuitId = '123e4567-e89b-12d3-a456-426614174000';
      const question = 'How many neurons?';

      await expect(
        tool.execute({
          circuit_id: circuitId,
          population_name: 'S1nonbarrel_neurons',
          question: question,
        })
      ).rejects.toThrow(circuitId);
    });
  });

  describe('isOnline', () => {
    it('should return true', async () => {
      const result =
        await CircuitPopulationAnalysisTool.isOnline(contextVariables);
      expect(result).toBe(true);
    });
  });
});
