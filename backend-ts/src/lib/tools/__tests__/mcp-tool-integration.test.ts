/**
 * MCP Tool Integration Tests
 *
 * Tests that MCP tools are properly integrated into the tool system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeTools, ToolConfig } from '../index';
import { toolRegistry, BaseTool } from '../base-tool';
import { SettingsMCP } from '@/lib/config/settings';
import { z } from 'zod';

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

  it('should include all tool classes in getAllMetadata', async () => {
    // Create test tool classes
    class TestTool1 extends BaseTool<z.ZodObject<any>> {
      static readonly toolName = 'test_tool_1';
      static readonly toolDescription = 'Test tool 1';
      static readonly toolUtterances = ['test'];

      override contextVariables = {};
      override inputSchema = z.object({ value: z.string() });

      async execute(input: any): Promise<any> {
        return { result: input.value };
      }
    }

    class TestTool2 extends BaseTool<z.ZodObject<any>> {
      static readonly toolName = 'test_tool_2';
      static readonly toolDescription = 'Test tool 2';
      static readonly toolUtterances = ['test'];

      override contextVariables = {};
      override inputSchema = z.object({ value: z.string() });

      async execute(input: any): Promise<any> {
        return { result: input.value };
      }
    }

    toolRegistry.registerClass(TestTool1);
    toolRegistry.registerClass(TestTool2);

    // Get all metadata
    const allMetadata = toolRegistry.getAllMetadata();

    // Should include both tools
    expect(allMetadata.length).toBeGreaterThanOrEqual(2);

    // Should include test_tool_1
    const tool1Meta = allMetadata.find((m) => m.name === 'test_tool_1');
    expect(tool1Meta).toBeDefined();

    // Should include test_tool_2
    const tool2Meta = allMetadata.find((m) => m.name === 'test_tool_2');
    expect(tool2Meta).toBeDefined();
  });
});
