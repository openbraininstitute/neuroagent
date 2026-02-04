/**
 * Human-in-the-Loop (HIL) Validation Tests
 *
 * Tests the HIL validation flow for tools that require explicit user approval.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DangerousTool } from '../src/lib/tools/test/DangerousTool';
import { toolRegistry } from '../src/lib/tools/base-tool';

describe('HIL Validation', () => {
  beforeEach(() => {
    // Clear registry before each test
    toolRegistry.clear();
  });

  afterEach(() => {
    // Clean up after each test
    toolRegistry.clear();
  });

  describe('Tool Metadata', () => {
    it('should identify HIL tools correctly', () => {
      // Register the dangerous tool
      toolRegistry.registerClass(DangerousTool);

      // Get metadata
      const metadata = toolRegistry.getAllMetadata();
      const dangerousTool = metadata.find((m) => m.name === 'dangerous_tool');

      expect(dangerousTool).toBeDefined();
      expect(dangerousTool?.hil).toBe(true);
    });

    it('should have requiresHIL method return true', () => {
      const tool = new DangerousTool({});
      expect(tool.requiresHIL()).toBe(true);
    });

    it('should have correct tool metadata', () => {
      expect(DangerousTool.toolName).toBe('dangerous_tool');
      expect(DangerousTool.toolHil).toBe(true);
      expect(DangerousTool.toolDescription).toContain('dangerous');
      expect(DangerousTool.toolUtterances).toBeDefined();
      expect(DangerousTool.toolUtterances?.includes('dangerous')).toBe(true);
    });
  });

  describe('Tool Execution', () => {
    it('should execute successfully with valid inputs', async () => {
      const tool = new DangerousTool({});

      const input = {
        action: 'delete',
        target: 'test.txt',
      };

      const result = await tool.execute(input);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('completed');
      expect(parsed.action).toBe('delete');
      expect(parsed.target).toBe('test.txt');
    });

    it('should include timestamp in result', async () => {
      const tool = new DangerousTool({});

      const input = {
        action: 'modify',
        target: 'config.json',
      };

      const result = await tool.execute(input);
      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should handle optional confirm parameter', async () => {
      const tool = new DangerousTool({});

      const input = {
        action: 'execute',
        target: 'script.sh',
        confirm: true,
      };

      const result = await tool.execute(input);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('completed');
    });
  });

  describe('Tool Health Check', () => {
    it('should report as online', async () => {
      const tool = new DangerousTool({});
      const isOnline = await tool.isOnline();

      expect(isOnline).toBe(true);
    });
  });

  describe('Vercel Tool Conversion', () => {
    it('should convert to Vercel AI SDK format', () => {
      const tool = new DangerousTool({});
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toBeDefined();
      expect(vercelTool.description).toContain('dangerous');
      expect(vercelTool.parameters).toBeDefined();
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should have correct parameter schema', () => {
      const tool = new DangerousTool({});
      const vercelTool = tool.toVercelTool();

      // The parameters should be a Zod schema
      expect(vercelTool.parameters).toBeDefined();

      // Test schema validation
      const validInput = {
        action: 'test',
        target: 'file.txt',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid inputs', () => {
      const tool = new DangerousTool({});

      // Missing required fields
      const invalidInput = {
        action: 'test',
        // missing target
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Registry Integration', () => {
    it('should register and retrieve HIL tool', () => {
      toolRegistry.registerClass(DangerousTool);

      const ToolClass = toolRegistry.getClass('dangerous_tool');
      expect(ToolClass).toBeDefined();
      expect(ToolClass?.toolHil).toBe(true);
    });

    it('should include HIL flag in metadata', () => {
      toolRegistry.registerClass(DangerousTool);

      const metadata = toolRegistry.getAllMetadata();
      const hilTools = metadata.filter((m) => m.hil === true);

      expect(hilTools.length).toBeGreaterThan(0);
      const dangerousTool = hilTools.find((m) => m.name === 'dangerous_tool');
      expect(dangerousTool).toBeDefined();
    });
  });
});

describe('HIL Validation Flow Integration', () => {
  it('should identify tools requiring validation', () => {
    toolRegistry.clear();
    toolRegistry.registerClass(DangerousTool);

    const allTools = toolRegistry.getAllClasses();
    const hilTools = allTools.filter((ToolClass) => ToolClass.toolHil === true);

    expect(hilTools.length).toBe(1);
    expect(hilTools[0]!.toolName).toBe('dangerous_tool');
  });

  it('should allow instantiation with context variables', () => {
    const contextVariables = {
      someConfig: 'value',
    };

    const tool = new DangerousTool(contextVariables);
    expect(tool).toBeDefined();
    expect(tool.contextVariables).toEqual(contextVariables);
  });
});
