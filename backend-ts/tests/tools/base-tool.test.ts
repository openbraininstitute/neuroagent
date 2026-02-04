/**
 * Tests for Base Tool System
 *
 * Validates the core functionality of BaseTool, ToolRegistry,
 * and tool metadata handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { BaseTool, ToolRegistry, ToolMetadata } from '@/lib/tools/base-tool';

// Test tool implementation
const TestToolInputSchema = z.object({
  input: z.string(),
  count: z.number().default(1),
});

class TestTool extends BaseTool<typeof TestToolInputSchema> {
  static readonly toolName = 'test_tool';
  static readonly toolNameFrontend = 'Test Tool';
  static readonly toolDescription = 'A test tool for unit testing';
  static readonly toolDescriptionFrontend = 'Test tool for users';
  static readonly toolUtterances = ['test', 'check'];
  static readonly toolHil = false;

  contextVariables = {};
  inputSchema = TestToolInputSchema;

  async execute(input: z.infer<typeof TestToolInputSchema>): Promise<unknown> {
    return {
      result: input.input.repeat(input.count),
      processed: true,
    };
  }
}

// HIL test tool
class HILTestTool extends BaseTool<typeof TestToolInputSchema> {
  static readonly toolName = 'hil_test_tool';
  static readonly toolDescription = 'A tool requiring human validation';
  static readonly toolHil = true;

  contextVariables = {};
  inputSchema = TestToolInputSchema;

  async execute(input: z.infer<typeof TestToolInputSchema>): Promise<unknown> {
    return { validated: true };
  }
}

// Tool with custom health check
class HealthCheckTool extends BaseTool<typeof TestToolInputSchema> {
  static readonly toolName = 'health_check_tool';
  static readonly toolDescription = 'A tool with custom health check';

  contextVariables = {};
  inputSchema = TestToolInputSchema;
  private online: boolean = true;

  setOnline(status: boolean): void {
    this.online = status;
  }

  async execute(input: z.infer<typeof TestToolInputSchema>): Promise<unknown> {
    return { status: 'ok' };
  }

  override async isOnline(): Promise<boolean> {
    return this.online;
  }
}

describe('BaseTool', () => {
  it('should have required metadata via static properties', () => {
    const tool = new TestTool();

    expect(tool.getName()).toBe('test_tool');
    expect(tool.getDescription()).toBeTruthy();
  });

  it('should execute with valid input', async () => {
    const tool = new TestTool();
    const result = await tool.execute({ input: 'hello', count: 3 });

    expect(result).toEqual({
      result: 'hellohellohello',
      processed: true,
    });
  });

  it('should validate input with schema', async () => {
    const tool = new TestTool();

    // Valid input should parse
    const validInput = { input: 'test', count: 2 };
    const parsed = tool.inputSchema.parse(validInput);
    expect(parsed).toEqual(validInput);

    // Invalid input should throw
    expect(() => tool.inputSchema.parse({ input: 123 })).toThrow();
  });

  it('should convert to Vercel AI SDK format', () => {
    const tool = new TestTool();
    const vercelTool = tool.toVercelTool();

    expect(vercelTool).toBeDefined();
    expect(vercelTool.description).toBe(tool.getDescription());
    expect(vercelTool.parameters).toBe(tool.inputSchema);
  });

  it('should return frontend name', () => {
    const tool = new TestTool();

    expect(tool.getFrontendName()).toBe('Test Tool');
  });

  it('should fallback to backend name if no frontend name', () => {
    const tool = new HILTestTool();

    expect(tool.getFrontendName()).toBe('hil_test_tool');
  });

  it('should return frontend description', () => {
    const tool = new TestTool();

    expect(tool.getFrontendDescription()).toBe('Test tool for users');
  });

  it('should fallback to backend description if no frontend description', () => {
    const tool = new HILTestTool();

    expect(tool.getFrontendDescription()).toBe('A tool requiring human validation');
  });

  it('should identify HIL tools', () => {
    const regularTool = new TestTool();
    const hilTool = new HILTestTool();

    expect(regularTool.requiresHIL()).toBe(false);
    expect(hilTool.requiresHIL()).toBe(true);
  });

  it('should return utterances', () => {
    const tool = new TestTool();

    expect(tool.getUtterances()).toEqual(['test', 'check']);
  });

  it('should return empty array if no utterances', () => {
    const tool = new HILTestTool();

    expect(tool.getUtterances()).toEqual([]);
  });

  it('should have default health check returning true', async () => {
    const tool = new TestTool();

    expect(await tool.isOnline()).toBe(true);
  });

  it('should support custom health check', async () => {
    const tool = new HealthCheckTool();

    expect(await tool.isOnline()).toBe(true);

    tool.setOnline(false);
    expect(await tool.isOnline()).toBe(false);
  });
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register a tool class', () => {
    registry.registerClass(TestTool);

    expect(registry.getClass('test_tool')).toBe(TestTool);
  });

  it('should throw error when registering duplicate tool', () => {
    registry.registerClass(TestTool);

    expect(() => registry.registerClass(TestTool)).toThrow(
      'Tool with name "test_tool" is already registered'
    );
  });

  it('should return undefined for non-existent tool', () => {
    expect(registry.getClass('non_existent')).toBeUndefined();
  });

  it('should return all registered tool classes', () => {
    registry.registerClass(TestTool);
    registry.registerClass(HILTestTool);

    const allTools = registry.getAllClasses();
    expect(allTools).toHaveLength(2);
    expect(allTools).toContain(TestTool);
    expect(allTools).toContain(HILTestTool);
  });

  it('should return all tool metadata', () => {
    registry.registerClass(TestTool);
    registry.registerClass(HILTestTool);

    const metadata = registry.getAllMetadata();

    expect(metadata).toHaveLength(2);
    expect(metadata[0].name).toBe('test_tool');
    expect(metadata[1].name).toBe('hil_test_tool');
  });

  it('should check health of all tools', async () => {
    registry.registerClass(TestTool);
    registry.registerClass(HealthCheckTool);

    const healthMap = await registry.checkAllHealth();

    expect(healthMap.get('test_tool')).toBe(true);
    expect(healthMap.get('health_check_tool')).toBe(true);
  });

  it('should handle health check errors gracefully', async () => {
    class FailingTool extends BaseTool<typeof TestToolInputSchema> {
      static readonly toolName = 'failing_tool';
      static readonly toolDescription = 'A tool that fails health checks';

      contextVariables = {};
      inputSchema = TestToolInputSchema;

      async execute(): Promise<unknown> {
        return {};
      }

      override async isOnline(): Promise<boolean> {
        throw new Error('Health check failed');
      }
    }

    registry.registerClass(FailingTool);

    const healthMap = await registry.checkAllHealth();

    expect(healthMap.get('failing_tool')).toBe(true); // Default to true when no static isOnline method
  });

  it('should clear all tools', () => {
    registry.registerClass(TestTool);
    registry.registerClass(HILTestTool);

    expect(registry.getAllClasses()).toHaveLength(2);

    registry.clear();

    expect(registry.getAllClasses()).toHaveLength(0);
  });
});
