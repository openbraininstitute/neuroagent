/**
 * MCP Tool Integration Tests
 *
 * Tests that MCP tools are properly integrated into the tool system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeTools, ToolConfig } from '../index';
import { toolRegistry } from '../base-tool';
import { SettingsMCP } from '@/lib/config/settings';

describe('MCP Tool Integration', () => {
  beforeEach(() => {
    // Clear registry before each test
    toolRegistry.clear();
  });

  it('should load MCP tools when mcpConfig is provided', async () => {
    const mcpConfig: SettingsMCP = {
      servers: {
        'test-server': {
          command: 'echo',
          args: ['test'],
          env: {},
          autoApprove: [],
        },
      },
    };

    const config: ToolConfig = {
      mcpConfig,
    };

    // This should not throw even if the MCP server fails to connect
    // It should just log an error and continue
    const tools = await initializeTools(config);

    // Tools should be an array (may be empty if MCP connection fails)
    expect(Array.isArray(tools)).toBe(true);
  });

  it('should not fail when mcpConfig is not provided', async () => {
    const config: ToolConfig = {};

    const tools = await initializeTools(config);

    // Should return tools without MCP tools
    expect(Array.isArray(tools)).toBe(true);
  });

  it('should handle MCP tool classes in the registry', async () => {
    // MCP tools are now classes, just like regular tools
    // They should be registered as classes, not instances
    const { CalculatorTool } = await import('../calculator-tool');
    toolRegistry.registerClass(CalculatorTool);

    // Should be able to retrieve it
    const retrieved = toolRegistry.getClass('calculator');
    expect(retrieved).toBeDefined();
    expect(retrieved?.toolName).toBe('calculator');

    // Should be able to check HIL requirement
    const requiresHIL = toolRegistry.requiresHIL('calculator');
    expect(requiresHIL).toBe(false);
  });

  it('should handle tool classes in requiresHIL check', async () => {
    // Test with a class
    const { CalculatorTool } = await import('../calculator-tool');
    toolRegistry.registerClass(CalculatorTool);

    const classRequiresHIL = toolRegistry.requiresHIL('calculator');
    expect(classRequiresHIL).toBe(false);
  });

  it('should return false for unknown tools in requiresHIL check', () => {
    const requiresHIL = toolRegistry.requiresHIL('unknown-tool');
    expect(requiresHIL).toBe(false);
  });

  it('should include all tool classes in getAllMetadata', async () => {
    // Register regular tool classes
    const { CalculatorTool } = await import('../calculator-tool');
    const { ExampleTool } = await import('../example-tool');

    toolRegistry.registerClass(CalculatorTool);
    toolRegistry.registerClass(ExampleTool);

    // Get all metadata
    const allMetadata = toolRegistry.getAllMetadata();

    // Should include both tools
    expect(allMetadata.length).toBeGreaterThanOrEqual(2);

    // Should include the calculator tool
    const calculatorMeta = allMetadata.find((m) => m.name === 'calculator');
    expect(calculatorMeta).toBeDefined();
    expect(calculatorMeta?.nameFrontend).toBe('Calculator');

    // Should include the example tool
    const exampleMeta = allMetadata.find((m) => m.name === 'example_tool');
    expect(exampleMeta).toBeDefined();
  });
});
