/**
 * Tests for OBI-One Generate Simulations Config tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateSimulationsConfigTool } from '../generate-simulations-config';
import type { GenerateSimulationsConfigContextVariables } from '../generate-simulations-config';

describe('GenerateSimulationsConfigTool', () => {
  let mockOpenAIClient: any;
  let contextVariables: GenerateSimulationsConfigContextVariables;

  beforeEach(() => {
    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    contextVariables = {
      openaiClient: mockOpenAIClient,
      model: 'gpt-4o-mini',
      tokenConsumption: null,
    };
  });

  describe('GenerateSimulationsConfigTool', () => {
    it('should have correct metadata', () => {
      expect(GenerateSimulationsConfigTool.toolName).toBe(
        'obione-generatesimulationsconfig'
      );
      expect(GenerateSimulationsConfigTool.toolNameFrontend).toBe(
        'Generate Simulation Config'
      );
      expect(GenerateSimulationsConfigTool.toolDescription).toContain(
        'This tool generates JSON configurations for simulations'
      );
      expect(GenerateSimulationsConfigTool.utterances).toContain(
        'Create a simulation configuration'
      );
    });

    it('should execute successfully with valid input', async () => {
      const mockGeneratedConfig = {
        type: 'SimulationsForm',
        timestamps: {},
        stimuli: {},
        recordings: {},
        neuron_sets: {},
        synaptic_manipulations: {},
        initialize: {
          type: 'SimulationsForm.Initialize',
          duration: 1000.0,
          dt: 0.025,
          seed: 42,
        },
        info: {
          campaign_name: 'Test Campaign',
          campaign_description: 'Test simulation config',
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockGeneratedConfig),
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 300,
          total_tokens: 800,
        },
      });

      const tool = new GenerateSimulationsConfigTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        config_request:
          'Create a simulation with a current clamp stimulus of 0.5 nA for 500ms starting at 100ms, targeting neurons 1-5',
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('current clamp'),
            }),
          ]),
          response_format: expect.objectContaining({
            type: 'json_schema',
          }),
        })
      );

      expect(result).toHaveProperty('type', 'SimulationsForm');
      expect(result.initialize).toHaveProperty('circuit');
      expect(result.initialize.circuit).toEqual({
        type: 'CircuitFromID',
        id_str: '123e4567-e89b-12d3-a456-426614174002',
      });
    });

    it('should track token consumption', async () => {
      const mockGeneratedConfig = {
        type: 'SimulationsForm',
        timestamps: {},
        stimuli: {},
        recordings: {},
        neuron_sets: {},
        synaptic_manipulations: {},
        initialize: {
          type: 'SimulationsForm.Initialize',
          duration: 1000.0,
          dt: 0.025,
        },
        info: {
          campaign_name: 'Basic Campaign',
          campaign_description: 'Basic simulation',
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockGeneratedConfig),
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });

      const tool = new GenerateSimulationsConfigTool(contextVariables);
      await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        config_request: 'Create a basic simulation',
      });

      expect(contextVariables.tokenConsumption).toEqual({
        model: 'gpt-4o-mini',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      });
    });

    it('should throw error when OpenAI returns no content', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const tool = new GenerateSimulationsConfigTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'Create a simulation',
        })
      ).rejects.toThrow("Couldn't generate a valid simulation config");
    });

    it('should throw error when OpenAI call fails', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API Error')
      );

      const tool = new GenerateSimulationsConfigTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'Create a simulation',
        })
      ).rejects.toThrow('Failed to generate simulation config: OpenAI API Error');
    });

    it('should validate circuit_id is a valid UUID', () => {
      const tool = new GenerateSimulationsConfigTool(contextVariables);

      // Valid UUID
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'test',
        })
      ).not.toThrow();

      // Invalid UUID
      expect(() =>
        tool.inputSchema.parse({
          circuit_id: 'not-a-uuid',
          config_request: 'test',
        })
      ).toThrow();
    });

    it('should use default model when not specified', async () => {
      const mockGeneratedConfig = {
        type: 'SimulationsForm',
        timestamps: {},
        stimuli: {},
        recordings: {},
        neuron_sets: {},
        synaptic_manipulations: {},
        initialize: {
          type: 'SimulationsForm.Initialize',
          duration: 1000.0,
          dt: 0.025,
        },
        info: {
          campaign_name: 'Default Model Campaign',
          campaign_description: 'Default model test',
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockGeneratedConfig),
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });

      const contextWithoutModel: GenerateSimulationsConfigContextVariables = {
        openaiClient: mockOpenAIClient,
        tokenConsumption: null,
      };

      const tool = new GenerateSimulationsConfigTool(contextWithoutModel);
      await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        config_request: 'Create a simulation',
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        })
      );
    });
  });

  describe('isOnline', () => {
    it('should always return true', async () => {
      const result = await GenerateSimulationsConfigTool.isOnline();
      expect(result).toBe(true);
    });
  });
});
