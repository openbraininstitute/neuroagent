/**
 * Tests for standalone tool registration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAvailableToolClasses, createToolInstance } from '../index';
import type { ToolConfig } from '../index';

describe('Standalone Tool Registration', () => {
  let config: ToolConfig;

  beforeEach(() => {
    config = {
      httpClient: {} as any,
      exaApiKey: 'test-exa-key',
      sanityUrl: 'https://api.sanity.io/test',
      entitycoreUrl: 'https://api.entitycore.test',
      openaiApiKey: 'test-openai-key',
    };
  });

  describe('getAvailableToolClasses', () => {
    it('should include Literature Search tool when exaApiKey is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).toContain('literature-search-tool');
    });

    it('should include Web Search tool when exaApiKey is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).toContain('web-search-tool');
    });

    it('should include Read Paper tool when exaApiKey is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).toContain('read-paper');
    });

    it('should include Circuit Population Analysis tool when entitycoreUrl and openaiApiKey are configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).toContain('circuit-population-data-analysis');
    });

    it('should include OBI Expert tool when sanityUrl is configured', async () => {
      const toolClasses = await getAvailableToolClasses(config);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).toContain('obi-expert');
    });

    it('should not include Exa tools when exaApiKey is not configured', async () => {
      const configWithoutExa = { ...config, exaApiKey: undefined };
      const toolClasses = await getAvailableToolClasses(configWithoutExa);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).not.toContain('literature-search-tool');
      expect(toolNames).not.toContain('web-search-tool');
      expect(toolNames).not.toContain('read-paper');
    });

    it('should not include OBI Expert tool when sanityUrl is not configured', async () => {
      const configWithoutSanity = { ...config, sanityUrl: undefined };
      const toolClasses = await getAvailableToolClasses(configWithoutSanity);
      const toolNames = toolClasses.map((cls) => cls.toolName);

      expect(toolNames).not.toContain('obi-expert');
    });
  });

  describe('createToolInstance', () => {
    it('should create Literature Search tool instance', async () => {
      const { LiteratureSearchTool } = await import('../standalone/literature-search');
      const instance = await createToolInstance(LiteratureSearchTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.exaApiKey).toBe('test-exa-key');
    });

    it('should create Web Search tool instance', async () => {
      const { WebSearchTool } = await import('../standalone/web-search');
      const instance = await createToolInstance(WebSearchTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.exaApiKey).toBe('test-exa-key');
    });

    it('should create Read Paper tool instance', async () => {
      const { ReadPaperTool } = await import('../standalone/read-paper');
      const instance = await createToolInstance(ReadPaperTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.exaApiKey).toBe('test-exa-key');
    });

    it('should create Circuit Population Analysis tool instance', async () => {
      const { CircuitPopulationAnalysisTool } = await import(
        '../standalone/circuit-population-analysis'
      );
      const instance = await createToolInstance(
        CircuitPopulationAnalysisTool,
        config
      );

      expect(instance).toBeDefined();
      expect(instance.contextVariables.entitycoreUrl).toBe(
        'https://api.entitycore.test'
      );
      expect(instance.contextVariables.openaiApiKey).toBe('test-openai-key');
    });

    it('should create OBI Expert tool instance', async () => {
      const { OBIExpertTool } = await import('../standalone/obi-expert');
      const instance = await createToolInstance(OBIExpertTool, config);

      expect(instance).toBeDefined();
      expect(instance.contextVariables.sanityUrl).toBe(
        'https://api.sanity.io/test'
      );
    });

    it('should throw error when creating Literature Search tool without exaApiKey', async () => {
      const { LiteratureSearchTool } = await import('../standalone/literature-search');
      const configWithoutExa = { ...config, exaApiKey: undefined };

      await expect(
        createToolInstance(LiteratureSearchTool, configWithoutExa)
      ).rejects.toThrow('Literature Search tool requires exaApiKey');
    });

    it('should throw error when creating OBI Expert tool without sanityUrl', async () => {
      const { OBIExpertTool } = await import('../standalone/obi-expert');
      const configWithoutSanity = { ...config, sanityUrl: undefined };

      await expect(
        createToolInstance(OBIExpertTool, configWithoutSanity)
      ).rejects.toThrow('OBI Expert tool requires sanityUrl');
    });
  });
});
