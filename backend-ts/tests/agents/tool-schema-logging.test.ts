/**
 * Test for tool schema logging functionality
 *
 * Verifies that tool schemas are correctly converted to JSON Schema
 * and can be logged before being sent to the LLM.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseTool, BaseContextVariables } from '../../src/lib/tools/base-tool';

// Test tool for schema logging
const TestToolInputSchema = z.object({
  query: z.string().describe('Test query parameter'),
  count: z.number().int().positive().default(5).describe('Number of results'),
  enabled: z.boolean().optional().describe('Enable feature flag'),
});

interface TestToolContext extends BaseContextVariables {
  apiUrl: string;
}

class TestTool extends BaseTool<typeof TestToolInputSchema, TestToolContext> {
  static readonly toolName = 'test_tool';
  static readonly toolDescription = 'A test tool for schema logging';

  override contextVariables: TestToolContext;
  override inputSchema = TestToolInputSchema;

  constructor(contextVariables: TestToolContext) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof TestToolInputSchema>): Promise<unknown> {
    return { success: true, input };
  }
}

describe('Tool Schema Logging', () => {
  it('should convert Zod schema to JSON Schema', () => {
    const tool = new TestTool({ apiUrl: 'https://example.com' });
    const vercelTool = tool.toVercelTool();

    // Access the parameters property (Zod schema)
    const zodSchema = (vercelTool as any).parameters;
    expect(zodSchema).toBeDefined();

    // Convert to JSON Schema
    const jsonSchema = zodToJsonSchema(zodSchema, 'test_tool');

    // Verify the JSON Schema structure
    expect(jsonSchema).toHaveProperty('type', 'object');
    expect(jsonSchema).toHaveProperty('properties');
    expect(jsonSchema.properties).toHaveProperty('query');
    expect(jsonSchema.properties).toHaveProperty('count');
    expect(jsonSchema.properties).toHaveProperty('enabled');
  });

  it('should include descriptions in JSON Schema', () => {
    const tool = new TestTool({ apiUrl: 'https://example.com' });
    const vercelTool = tool.toVercelTool();
    const zodSchema = (vercelTool as any).parameters;
    const jsonSchema = zodToJsonSchema(zodSchema, 'test_tool');

    // Verify descriptions are preserved
    expect(jsonSchema.properties.query).toHaveProperty('description', 'Test query parameter');
    expect(jsonSchema.properties.count).toHaveProperty('description', 'Number of results');
    expect(jsonSchema.properties.enabled).toHaveProperty('description', 'Enable feature flag');
  });

  it('should include default values in JSON Schema', () => {
    const tool = new TestTool({ apiUrl: 'https://example.com' });
    const vercelTool = tool.toVercelTool();
    const zodSchema = (vercelTool as any).parameters;
    const jsonSchema = zodToJsonSchema(zodSchema, 'test_tool');

    // Verify default value is preserved
    expect(jsonSchema.properties.count).toHaveProperty('default', 5);
  });

  it('should mark required fields correctly', () => {
    const tool = new TestTool({ apiUrl: 'https://example.com' });
    const vercelTool = tool.toVercelTool();
    const zodSchema = (vercelTool as any).parameters;
    const jsonSchema = zodToJsonSchema(zodSchema, 'test_tool');

    // Verify required fields
    expect(jsonSchema).toHaveProperty('required');
    expect(jsonSchema.required).toContain('query');
    expect(jsonSchema.required).not.toContain('enabled'); // optional field
  });

  it('should serialize tool schema to JSON string without errors', () => {
    const tool = new TestTool({ apiUrl: 'https://example.com' });
    const vercelTool = tool.toVercelTool();
    const zodSchema = (vercelTool as any).parameters;

    const toolSchema = {
      name: TestTool.toolName,
      description: (vercelTool as any).description,
      parameters: zodSchema ? zodToJsonSchema(zodSchema, TestTool.toolName) : null,
    };

    // Should serialize without throwing
    expect(() => JSON.stringify(toolSchema, null, 2)).not.toThrow();

    // Verify the serialized output
    const serialized = JSON.stringify(toolSchema, null, 2);
    expect(serialized).toContain('"name": "test_tool"');
    expect(serialized).toContain('"description": "A test tool for schema logging"');
    expect(serialized).toContain('"parameters"');
  });
});
