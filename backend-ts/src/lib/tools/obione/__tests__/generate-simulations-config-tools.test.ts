/**
 * Tests for OBI-One Generate Simulations Config tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateSimulationsConfigTool } from '../generate-simulations-config';
import type { GenerateSimulationsConfigContextVariables } from '../generate-simulations-config';

// Mock Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => (model: string) => ({ modelId: model, provider: 'openai' })),
}));

describe('GenerateSimulationsConfigTool', () => {
  let mockHttpClient: any;
  let contextVariables: GenerateSimulationsConfigContextVariables;

  beforeEach(() => {
    vi.clearAllMocks();

    mockHttpClient = {
      get: vi.fn(),
    };

    contextVariables = {
      httpClient: mockHttpClient,
      obiOneUrl: 'https://api.example.com',
      vlabId: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      sharedState: {
        smc_simulation_config: {
          type: 'CircuitSimulationScanConfig',
          timestamps: {},
          stimuli: {},
          recordings: {},
          neuron_sets: {},
          synaptic_manipulations: {},
          initialize: {
            type: 'CircuitSimulationScanConfig.Initialize',
            duration: 1000.0,
            dt: 0.025,
          },
          info: {
            campaign_name: 'Existing Campaign',
            campaign_description: 'Existing config',
          },
        },
      },
      entityFrontendUrl: 'https://frontend.example.com',
      model: 'gpt-4o-mini',
      openaiApiKey: 'test-api-key',
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
      // Mock circuit nodesets response
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodesets: ['Excitatory', 'Inhibitory'],
        }),
      });

      const mockGeneratedConfig = {
        type: 'CircuitSimulationScanConfig',
        timestamps: {},
        stimuli: {},
        recordings: {},
        neuron_sets: {},
        synaptic_manipulations: {},
        initialize: {
          type: 'CircuitSimulationScanConfig.Initialize',
          duration: 1000.0,
          dt: 0.025,
          seed: 42,
        },
        info: {
          campaign_name: 'Test Campaign',
          campaign_description: 'Test simulation config',
        },
      };

      // Mock generateObject from Vercel AI SDK
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockResolvedValue({
        object: mockGeneratedConfig,
        usage: {
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800,
        },
        finishReason: 'stop',
        warnings: undefined,
      } as any);

      const tool = new GenerateSimulationsConfigTool(contextVariables);
      const result = await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        config_request:
          'Create a simulation with a current clamp stimulus of 0.5 nA for 500ms starting at 100ms, targeting neurons 1-5',
      });

      // Verify circuit nodesets were fetched
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/declared/circuit/123e4567-e89b-12d3-a456-426614174002/nodesets',
        {
          headers: {
            'virtual-lab-id': '123e4567-e89b-12d3-a456-426614174000',
            'project-id': '123e4567-e89b-12d3-a456-426614174001',
          },
        }
      );

      // Verify generateObject was called with correct parameters
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ modelId: 'gpt-4o-mini' }),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        })
      );

      expect(result).toHaveProperty('type', 'CircuitSimulationScanConfig');
      expect(result.initialize.circuit).toEqual({
        type: 'CircuitFromID',
        id_str: '123e4567-e89b-12d3-a456-426614174002',
      });
    });

    it('should track token consumption', async () => {
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodesets: [],
        }),
      });

      const mockGeneratedConfig = {
        type: 'CircuitSimulationScanConfig',
        timestamps: {},
        stimuli: {},
        recordings: {},
        neuron_sets: {},
        synaptic_manipulations: {},
        initialize: {
          type: 'CircuitSimulationScanConfig.Initialize',
          duration: 1000.0,
          dt: 0.025,
        },
        info: {
          campaign_name: 'Basic Campaign',
          campaign_description: 'Basic simulation',
        },
      };

      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockResolvedValue({
        object: mockGeneratedConfig,
        usage: {
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800,
        },
        finishReason: 'stop',
        warnings: undefined,
      } as any);

      const tool = new GenerateSimulationsConfigTool(contextVariables);
      await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        config_request: 'Create a basic simulation',
      });

      expect(contextVariables.tokenConsumption).toEqual({
        model: 'gpt-4o-mini',
        input_tokens: 500,
        output_tokens: 300,
        total_tokens: 800,
      });
    });

    it('should throw error when sharedState is missing', async () => {
      // Mock httpClient to avoid the "Cannot read properties of undefined" error
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodesets: [],
        }),
      });

      const contextWithoutState: GenerateSimulationsConfigContextVariables = {
        ...contextVariables,
        sharedState: null,
      };

      const tool = new GenerateSimulationsConfigTool(contextWithoutState);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'Create a simulation',
        })
      ).rejects.toThrow(
        'A state with key `smc_simulation_config` must be provided'
      );
    });

    it('should throw error when smc_simulation_config is null', async () => {
      // Mock httpClient to avoid the "Cannot read properties of undefined" error
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodesets: [],
        }),
      });

      const contextWithNullConfig: GenerateSimulationsConfigContextVariables = {
        ...contextVariables,
        sharedState: {
          smc_simulation_config: null,
        },
      };

      const tool = new GenerateSimulationsConfigTool(contextWithNullConfig);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'Create a simulation',
        })
      ).rejects.toThrow('To edit a Small Microcircuit Simulation, first navigate to');
    });

    it('should throw error when OpenAI API key is missing', async () => {
      const contextWithoutApiKey: GenerateSimulationsConfigContextVariables = {
        ...contextVariables,
        openaiApiKey: undefined,
      };

      const tool = new GenerateSimulationsConfigTool(contextWithoutApiKey);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'Create a simulation',
        })
      ).rejects.toThrow('OpenAI API key is required for this tool');
    });

    it('should throw error when circuit nodesets fetch fails', async () => {
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const tool = new GenerateSimulationsConfigTool(contextVariables);

      await expect(
        tool.execute({
          circuit_id: '123e4567-e89b-12d3-a456-426614174002',
          config_request: 'Create a simulation',
        })
      ).rejects.toThrow('Network error');
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
      mockHttpClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodesets: [],
        }),
      });

      const mockGeneratedConfig = {
        type: 'CircuitSimulationScanConfig',
        timestamps: {},
        stimuli: {},
        recordings: {},
        neuron_sets: {},
        synaptic_manipulations: {},
        initialize: {
          type: 'CircuitSimulationScanConfig.Initialize',
          duration: 1000.0,
          dt: 0.025,
        },
        info: {
          campaign_name: 'Default Model Campaign',
          campaign_description: 'Default model test',
        },
      };

      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockResolvedValue({
        object: mockGeneratedConfig,
        usage: {
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800,
        },
        finishReason: 'stop',
        warnings: undefined,
      } as any);

      const contextWithoutModel: GenerateSimulationsConfigContextVariables = {
        ...contextVariables,
        model: undefined,
      };

      const tool = new GenerateSimulationsConfigTool(contextWithoutModel);
      await tool.execute({
        circuit_id: '123e4567-e89b-12d3-a456-426614174002',
        config_request: 'Create a simulation',
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ modelId: 'gpt-5-mini' }),
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
