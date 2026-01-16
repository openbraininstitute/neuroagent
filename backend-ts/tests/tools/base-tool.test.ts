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
  metadata: ToolMetadata = {
    name: 'test_tool',
    nameFrontend: 'Test Tool',
    description: 'A test tool for unit testing',
    descriptionFrontend: 'Test tool for users',
    utterances: ['test', 'check'],
    hil: false,
  };

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
  metadata: ToolMetadata = {
    name: 'hil_test_tool',
    description: 'A tool requiring human validation',
    hil: true,
  };

  inputSchema = TestToolInputSchema;

  async execute(input: z.infer<typeof TestToolInputSchema>): Promise<unknown> {
    return { validated: true };
  }
}

// Tool with custom health check
class HealthCheckTool extends BaseTool<typeof TestToolInputSchema> {
  metadata: ToolMetadata = {
    name: 'health_check_tool',
    description: 'A tool with custom health check',
  };

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
  it('should have required metadata', () => {
    const tool = new TestTool();

    expect(tool.metadata.name).toBe('test_tool');
    expect(tool.metadata.description).toBeTruthy();
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
    expect(vercelTool.description).toBe(tool.metadata.description);
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

    expect(tool.getFrontendDescription()).toBe(
      'A tool requiring human validation'
    );
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

  it('should register a tool', () => {
    const tool = new TestTool();
    registry.register(tool);

    expect(registry.get('test_tool')).toBe(tool);
  });

  it('should throw error when registering duplicate tool', () => {
    const tool1 = new TestTool();
    const tool2 = new TestTool();

    registry.register(tool1);

    expect(() => registry.register(tool2)).toThrow(
      'Tool with name "test_tool" is already registered'
    );
  });

  it('should return undefined for non-existent tool', () => {
    expect(registry.get('non_existent')).toBeUndefined();
  });

  it('should return all registered tools', () => {
    const tool1 = new TestTool();
    const tool2 = new HILTestTool();

    registry.register(tool1);
    registry.register(tool2);

    const allTools = registry.getAll();
    expect(allTools).toHaveLength(2);
    expect(allTools).toContain(tool1);
    expect(allTools).toContain(tool2);
  });

  it('should convert all tools to Vercel format', () => {
    const tool1 = new TestTool();
    const tool2 = new HILTestTool();

    registry.register(tool1);
    registry.register(tool2);

    const vercelTools = registry.getAllAsVercelTools();

    expect(Object.keys(vercelTools)).toHaveLength(2);
    expect(vercelTools['test_tool']).toBeDefined();
    expect(vercelTools['hil_test_tool']).toBeDefined();
  });

  it('should return all tool metadata', () => {
    const tool1 = new TestTool();
    const tool2 = new HILTestTool();

    registry.register(tool1);
    registry.register(tool2);

    const metadata = registry.getAllMetadata();

    expect(metadata).toHaveLength(2);
    expect(metadata[0].name).toBe('test_tool');
    expect(metadata[1].name).toBe('hil_test_tool');
  });

  it('should check health of all tools', async () => {
    const tool1 = new TestTool();
    const tool2 = new HealthCheckTool();

    registry.register(tool1);
    registry.register(tool2);

    tool2.setOnline(false);

    const healthMap = await registry.checkAllHealth();

    expect(healthMap.get('test_tool')).toBe(true);
    expect(healthMap.get('health_check_tool')).toBe(false);
  });

  it('should handle health check errors gracefully', async () => {
    class FailingTool extends BaseTool<typeof TestToolInputSchema> {
      metadata: ToolMetadata = {
        name: 'failing_tool',
        description: 'A tool that fails health checks',
      };

      inputSchema = TestToolInputSchema;

      async execute(): Promise<unknown> {
        return {};
      }

      override async isOnline(): Promise<boolean> {
        throw new Error('Health check failed');
      }
    }

    const tool = new FailingTool();
    registry.register(tool);

    const healthMap = await registry.checkAllHealth();

    expect(healthMap.get('failing_tool')).toBe(false);
  });

  it('should clear all tools', () => {
    const tool1 = new TestTool();
    const tool2 = new HILTestTool();

    registry.register(tool1);
    registry.register(tool2);

    expect(registry.getAll()).toHaveLength(2);

    registry.clear();

    expect(registry.getAll()).toHaveLength(0);
  });
});
