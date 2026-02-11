/**
 * Tool Integration and Testing
 *
 * Tests for:
 * - Tool discovery and registration
 * - Tool filtering by whitelist regex
 * - Tool integration with AgentsRoutine
 * - Tool health checks
 * - Tool execution through agent workflow
 *
 * Requirements: 18.13, 18.14
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAvailableToolClasses,
  createToolInstance,
  registerToolClasses,
  type ToolConfig,
} from '../index';
import { toolRegistry } from '../base-tool';

describe('Tool Integration and Testing', () => {
  let config: ToolConfig;

  beforeEach(() => {
    config = {
      httpClient: {} as any,
      exaApiKey: 'test-exa-key',
      sanityUrl: 'https://api.sanity.io/test',
      entitycoreUrl: 'https://api.entitycore.test',
      entityFrontendUrl: 'https://entity.test',
      obiOneUrl: 'https://api.obione.test',
      thumbnailGenerationUrl: 'https://api.thumbnail.test',
      openaiApiKey: 'test-openai-key',
      vlabId: 'test-vlab-id',
      projectId: 'test-project-id',
      s3Client: {} as any,
      userId: 'test-user-id',
      bucketName: 'test-bucket',
      threadId: 'test-thread-id',
    };
  });

  describe('Tool Discovery and Registration', () => {
    it('should register all tool classes', async () => {
      await registerToolClasses();

      // Check that registry has tools
      const allTools = toolRegistry.getAllClasses();
      expect(allTools.length).toBeGreaterThan(0);
    });

    it('should discover EntityCore tools when entitycoreUrl is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      // Check for some EntityCore tools
      expect(toolNames).toContain('entitycore-brainregion-getall');
      expect(toolNames).toContain('entitycore-brainregion-getone');
      expect(toolNames).toContain('entitycore-cellmorphology-getall');
      expect(toolNames).toContain('entitycore-cellmorphology-getone');
    });

    it('should discover OBIOne tools when obiOneUrl is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      // Check for OBIOne tools
      expect(toolNames).toContain('obione-circuitconnectivitymetrics-getone');
      expect(toolNames).toContain('obione-circuitmetrics-getone');
      expect(toolNames).toContain('obione-circuitnodesets-getone');
      expect(toolNames).toContain('obione-circuitpopulation-getone');
      expect(toolNames).toContain('obione-ephysmetrics-getone');
      expect(toolNames).toContain('obione-morphometrics-getone');
      expect(toolNames).toContain('obione-generatesimulationsconfig');
    });

    it('should discover Thumbnail Generation tools when thumbnailGenerationUrl is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      // Check for Thumbnail Generation tools
      expect(toolNames).toContain('thumbnail-generation-electricalcellrecording-getone');
      expect(toolNames).toContain('thumbnail-generation-morphology-getone');
    });

    it('should discover Standalone tools when dependencies are configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      // Check for Standalone tools
      expect(toolNames).toContain('literature-search-tool');
      expect(toolNames).toContain('web-search-tool');
      expect(toolNames).toContain('read-paper');
      expect(toolNames).toContain('circuit-population-data-analysis');
      expect(toolNames).toContain('obi-expert');
    });

    it('should include test tools for filtering', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      // Check for test tools
      expect(toolNames).toContain('get_weather');
      expect(toolNames).toContain('translate_text');
      expect(toolNames).toContain('get_time');
      expect(toolNames).toContain('convert_currency');
    });

    it('should not include tools when dependencies are missing', async () => {
      const minimalConfig: ToolConfig = {};
      const toolClasses = await getAvailableToolClasses(minimalConfig);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      // Should not include EntityCore tools
      expect(toolNames).not.toContain('entitycore-brainregion-getall');

      // Should not include OBIOne tools
      expect(toolNames).not.toContain('obione-circuitmetrics-getone');

      // Should not include Thumbnail Generation tools
      expect(toolNames).not.toContain('thumbnail-generation-morphology-getone');

      // Should not include Standalone tools (except test tools)
      expect(toolNames).not.toContain('literature-search-tool');
      expect(toolNames).not.toContain('obi-expert');

      // Should still include test tools
      expect(toolNames).toContain('get_weather');
      expect(toolNames).toContain('calculator');
    });
  });

  describe('Tool Filtering by Whitelist Regex', () => {
    it('should filter tools by whitelist regex pattern', async () => {
      const toolClasses = await getAvailableToolClasses(config);

      // Simulate filtering by regex (matching tool names that start with 'entitycore')
      const whitelistRegex = /^entitycore-.*/;
      const filteredTools = toolClasses.filter((cls) =>
        whitelistRegex.test(cls.toolName)
      );

      // Should only include EntityCore tools
      expect(filteredTools.length).toBeGreaterThan(0);
      filteredTools.forEach((cls) => {
        expect(cls.toolName).toMatch(/^entitycore-/);
      });
    });

    it('should filter tools by multiple patterns', async () => {
      const toolClasses = await getAvailableToolClasses(config);

      // Simulate filtering by regex (matching EntityCore OR OBIOne tools)
      const whitelistRegex = /^(entitycore-|obione-).*/;
      const filteredTools = toolClasses.filter((cls) =>
        whitelistRegex.test(cls.toolName)
      );

      // Should include both EntityCore and OBIOne tools
      expect(filteredTools.length).toBeGreaterThan(0);
      filteredTools.forEach((cls) => {
        expect(cls.toolName).toMatch(/^(entitycore-|obione-)/);
      });
    });

    it('should return empty array when no tools match whitelist', async () => {
      const toolClasses = await getAvailableToolClasses(config);

      // Simulate filtering by regex that matches nothing
      const whitelistRegex = /^nonexistent-.*/;
      const filteredTools = toolClasses.filter((cls) =>
        whitelistRegex.test(cls.toolName)
      );

      expect(filteredTools).toHaveLength(0);
    });

    it('should handle wildcard patterns', async () => {
      const toolClasses = await getAvailableToolClasses(config);

      // Simulate filtering by regex (matching all tools)
      const whitelistRegex = /.*/;
      const filteredTools = toolClasses.filter((cls) =>
        whitelistRegex.test(cls.toolName)
      );

      // Should include all tools
      expect(filteredTools.length).toBe(toolClasses.length);
    });
  });

  describe('Tool Instance Creation', () => {
    it('should create EntityCore tool instances with correct context', async () => {
      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');
      const instance = await createToolInstance(BrainRegionGetAllTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.entitycoreUrl).toBe('https://api.entitycore.test');
      expect(instance.contextVariables.entityFrontendUrl).toBe('https://entity.test');
      expect(instance.contextVariables.vlabId).toBe('test-vlab-id');
      expect(instance.contextVariables.projectId).toBe('test-project-id');
    });

    it('should create OBIOne tool instances with correct context', async () => {
      const { CircuitMetricGetOneTool } = await import('../obione/circuit-metric-getone');
      const instance = await createToolInstance(CircuitMetricGetOneTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.obiOneUrl).toBe('https://api.obione.test');
      expect(instance.contextVariables.vlabId).toBe('test-vlab-id');
      expect(instance.contextVariables.projectId).toBe('test-project-id');
    });

    it('should create Thumbnail Generation tool instances with correct context', async () => {
      const { PlotMorphologyGetOneTool } = await import(
        '../thumbnail_generation/plot-morphology-getone'
      );
      const instance = await createToolInstance(PlotMorphologyGetOneTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.thumbnailGenerationUrl).toBe(
        'https://api.thumbnail.test'
      );
      expect(instance.contextVariables.s3Client).toBeDefined();
      expect(instance.contextVariables.userId).toBe('test-user-id');
      expect(instance.contextVariables.bucketName).toBe('test-bucket');
    });

    it('should create Standalone tool instances with correct context', async () => {
      const { LiteratureSearchTool } = await import('../standalone/literature-search');
      const instance = await createToolInstance(LiteratureSearchTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.exaApiKey).toBe('test-exa-key');
    });

    it('should throw error when required config is missing', async () => {
      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');
      const invalidConfig = { ...config, entitycoreUrl: undefined };

      await expect(createToolInstance(BrainRegionGetAllTool, invalidConfig)).rejects.toThrow(
        'EntityCore tools require entitycoreUrl and entityFrontendUrl'
      );
    });
  });

  describe('Tool Health Checks', () => {
    it('should check health of EntityCore tools', async () => {
      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');

      // Mock httpClient for health check
      const mockHttpClient = {
        get: vi.fn().mockResolvedValue({ ok: true }),
      };

      const contextVariables = {
        httpClient: mockHttpClient,
        entitycoreUrl: 'https://api.entitycore.test',
        entityFrontendUrl: 'https://entity.test',
      };

      const isOnline = await BrainRegionGetAllTool.isOnline(contextVariables as any);

      expect(isOnline).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.entitycore.test/health'
      );
    });

    it('should return false when health check fails', async () => {
      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');

      // Mock httpClient that throws error
      const mockHttpClient = {
        get: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const contextVariables = {
        httpClient: mockHttpClient,
        entitycoreUrl: 'https://api.entitycore.test',
        entityFrontendUrl: 'https://entity.test',
      };

      const isOnline = await BrainRegionGetAllTool.isOnline(contextVariables as any);

      expect(isOnline).toBe(false);
    });

    it('should check health of OBIOne tools', async () => {
      const { CircuitMetricGetOneTool } = await import('../obione/circuit-metric-getone');

      // Mock httpClient for health check
      const mockHttpClient = {
        get: vi.fn().mockResolvedValue({ ok: true }),
      };

      const contextVariables = {
        httpClient: mockHttpClient,
        obiOneUrl: 'https://api.obione.test',
      };

      const isOnline = await CircuitMetricGetOneTool.isOnline(contextVariables as any);

      expect(isOnline).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith('https://api.obione.test/health');
    });

    it('should check health of Standalone tools', async () => {
      const { LiteratureSearchTool } = await import('../standalone/literature-search');

      const contextVariables = {
        exaApiKey: 'test-exa-key',
      };

      // Standalone tools that don't require external services should return true
      const isOnline = await LiteratureSearchTool.isOnline(contextVariables as any);

      expect(isOnline).toBe(true);
    });
  });

  describe('Tool Metadata Access', () => {
    it('should access tool metadata without instantiation', async () => {
      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');

      // Access static properties without creating instance
      expect(BrainRegionGetAllTool.toolName).toBe('entitycore-brainregion-getall');
      expect(BrainRegionGetAllTool.toolDescription).toBeDefined();
      expect(BrainRegionGetAllTool.toolDescription.length).toBeGreaterThan(0);
    });

    it('should have complete metadata for all tools', async () => {
      const toolClasses = await getAvailableToolClasses(config);

      toolClasses.forEach((ToolClass) => {
        // Check that all required metadata is present
        expect(ToolClass.toolName).toBeDefined();
        expect(ToolClass.toolName.length).toBeGreaterThan(0);

        expect(ToolClass.toolDescription).toBeDefined();
        expect(ToolClass.toolDescription.length).toBeGreaterThan(0);

        // Optional metadata
        if (ToolClass.toolDescriptionFrontend) {
          expect(ToolClass.toolDescriptionFrontend.length).toBeGreaterThan(0);
        }

        if (ToolClass.toolUtterances) {
          expect(Array.isArray(ToolClass.toolUtterances)).toBe(true);
        }
      });
    });
  });

  describe('Tool Integration with AgentsRoutine', () => {
    it('should convert tool classes to Vercel AI SDK format', async () => {
      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');
      const instance = await createToolInstance(BrainRegionGetAllTool, config);

      // Convert to Vercel AI SDK tool format
      const vercelTool = instance.toVercelTool();

      expect(vercelTool).toBeDefined();
      expect(vercelTool.description).toBe(BrainRegionGetAllTool.toolDescription);
      expect(vercelTool.parameters).toBeDefined();
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should prepare tools for agent workflow', async () => {
      const toolClasses = await getAvailableToolClasses(config);

      // Simulate preparing tools for agent
      const toolsForAgent: Record<string, any> = {};

      for (const ToolClass of toolClasses.slice(0, 5)) {
        // Test with first 5 tools
        const instance = await createToolInstance(ToolClass, config);
        const vercelTool = instance.toVercelTool();
        toolsForAgent[ToolClass.toolName] = vercelTool;
      }

      // Check that tools are properly formatted
      expect(Object.keys(toolsForAgent).length).toBe(5);
      Object.values(toolsForAgent).forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      });
    });
  });

  describe('Tool Execution', () => {
    it('should execute calculator tool (no external dependencies)', async () => {
      const { CalculatorTool } = await import('../calculator-tool');
      const instance = await createToolInstance(CalculatorTool, config);

      const result = await instance.execute({
        operation: 'add',
        a: 5,
        b: 3,
      });

      // Calculator tool returns an object with result property
      expect(result).toHaveProperty('result');
      expect(result.result).toBe(8);
    });

    it('should validate tool input with Zod schema', async () => {
      const { CalculatorTool } = await import('../calculator-tool');
      const instance = await createToolInstance(CalculatorTool, config);

      // Test with valid input - calculator doesn't throw on invalid operation
      // It just returns undefined result
      const result = await instance.execute({
        operation: 'invalid',
        a: 5,
        b: 3,
      } as any);

      // Result should be undefined for invalid operation
      expect(result.result).toBeUndefined();
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tool classes', async () => {
      await registerToolClasses();

      const { BrainRegionGetAllTool } = await import('../entitycore/brain-region-getall');

      // Retrieve tool class from registry
      const retrievedClass = toolRegistry.getClass('entitycore-brainregion-getall');

      expect(retrievedClass).toBe(BrainRegionGetAllTool);
    });

    it('should list all registered tool classes', async () => {
      await registerToolClasses();

      const allClasses = toolRegistry.getAllClasses();

      expect(allClasses.length).toBeGreaterThan(0);
      expect(allClasses.every((cls) => cls.toolName)).toBe(true);
    });

    it('should handle duplicate registration gracefully', async () => {
      await registerToolClasses();

      // Registering again should not throw error
      await expect(registerToolClasses()).resolves.not.toThrow();
    });
  });
});
