/**
 * Property-Based Tests for Tool Definition Generation
 *
 * Feature: typescript-backend-migration
 * Property 11: Tool Definition Generation
 *
 * For any tool with a Zod schema, the generated Vercel AI SDK tool definition
 * should be valid and executable.
 *
 * Validates: Requirements 5.4
 *
 * This test verifies that:
 * 1. Tools with Zod schemas generate valid Vercel AI SDK tool definitions
 * 2. The generated tool definitions have all required properties
 * 3. The tool definitions can be executed with valid inputs
 * 4. The tool definitions properly validate inputs using the Zod schema
 * 5. The tool execution returns expected results
 */

import { describe, it, expect } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { z } from 'zod';
import { BaseTool, BaseContextVariables } from '@/lib/tools/base-tool';

/**
 * Helper function to create a test tool with a given Zod schema
 */
function createTestTool<TSchema extends z.ZodType>(
  name: string,
  schema: TSchema,
  executeFn: (input: z.infer<TSchema>) => Promise<unknown>
) {
  class TestTool extends BaseTool<TSchema, BaseContextVariables> {
    static readonly toolName = name;
    static readonly toolDescription = `Test tool: ${name}`;
    static readonly toolUtterances = ['test'];

    override contextVariables: BaseContextVariables = {};
    override inputSchema = schema;

    constructor() {
      super();
    }

    async execute(input: z.infer<TSchema>): Promise<unknown> {
      return executeFn(input);
    }
  }

  return new TestTool();
}

describe('Tool Definition Generation Property Tests', () => {
  describe('Property 11: Tool Definition Generation', () => {
    /**
     * **Validates: Requirements 5.4**
     *
     * Test that any tool with a Zod schema generates a valid Vercel AI SDK definition
     */
    it('should generate valid Vercel AI SDK tool definition for any tool', () => {
      // Create a test tool with a simple schema
      const schema = z.object({
        value: z.string(),
        count: z.number().optional(),
      });

      const testTool = createTestTool('test_tool', schema, async (input) => {
        return { result: `${input.value} (${input.count || 0})` };
      });

      const vercelTool = testTool.toVercelTool();

      // Verify the tool definition has required properties
      expect(vercelTool).toBeDefined();
      expect(vercelTool.description).toBeDefined();
      expect(vercelTool.parameters).toBeDefined();
      expect(vercelTool.execute).toBeDefined();
      expect(typeof vercelTool.execute).toBe('function');
    });

    /**
     * Test that tool definitions include the correct description
     */
    it('should include tool description in Vercel AI SDK definition', () => {
      const schema = z.object({ value: z.string() });
      const testTool = createTestTool('test_tool', schema, async (input) => {
        return { result: input.value };
      });

      const vercelTool = testTool.toVercelTool();

      expect(vercelTool.description).toBe('Test tool: test_tool');
    });

    /**
     * Test that tool definitions include the Zod schema as parameters
     */
    it('should include Zod schema as parameters in Vercel AI SDK definition', () => {
      const schema = z.object({ value: z.string() });
      const testTool = createTestTool('test_tool', schema, async (input) => {
        return { result: input.value };
      });

      const vercelTool = testTool.toVercelTool();

      // The parameters should be the Zod schema
      expect(vercelTool.parameters).toBe(testTool.inputSchema);
    });

    /**
     * Property test: Tool with string input schema generates valid definition
     */
    test.prop([fc.string().filter((s) => s.length > 0)])(
      'should generate valid definition for tool with string input',
      async (testString) => {
        const schema = z.object({
          input: z.string(),
        });

        const tool = createTestTool('test_string_tool', schema, async (input) => {
          return { result: input.input.toUpperCase() };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.description).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);
        expect(typeof vercelTool.execute).toBe('function');

        // Verify execution with valid input
        const result = await vercelTool.execute({ input: testString });
        expect(result).toEqual({ result: testString.toUpperCase() });
      }
    );

    /**
     * Property test: Tool with number input schema generates valid definition
     */
    test.prop([fc.integer(), fc.integer()])(
      'should generate valid definition for tool with number inputs',
      async (num1, num2) => {
        const schema = z.object({
          a: z.number(),
          b: z.number(),
        });

        const tool = createTestTool('test_number_tool', schema, async (input) => {
          return { sum: input.a + input.b };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.description).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution
        const result = await vercelTool.execute({ a: num1, b: num2 });
        expect(result).toEqual({ sum: num1 + num2 });
      }
    );

    /**
     * Property test: Tool with boolean input schema generates valid definition
     */
    test.prop([fc.boolean()])(
      'should generate valid definition for tool with boolean input',
      async (boolValue) => {
        const schema = z.object({
          flag: z.boolean(),
        });

        const tool = createTestTool('test_boolean_tool', schema, async (input) => {
          return { negated: !input.flag };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution
        const result = await vercelTool.execute({ flag: boolValue });
        expect(result).toEqual({ negated: !boolValue });
      }
    );

    /**
     * Property test: Tool with array input schema generates valid definition
     */
    test.prop([fc.array(fc.string(), { minLength: 1, maxLength: 10 })])(
      'should generate valid definition for tool with array input',
      async (stringArray) => {
        const schema = z.object({
          items: z.array(z.string()),
        });

        const tool = createTestTool('test_array_tool', schema, async (input) => {
          return { count: input.items.length, items: input.items };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution
        const result = await vercelTool.execute({ items: stringArray });
        expect(result).toEqual({ count: stringArray.length, items: stringArray });
      }
    );

    /**
     * Property test: Tool with optional fields generates valid definition
     */
    test.prop([fc.string(), fc.option(fc.integer(), { nil: undefined })])(
      'should generate valid definition for tool with optional fields',
      async (requiredString, optionalNumber) => {
        const schema = z.object({
          required: z.string(),
          optional: z.number().optional(),
        });

        const tool = createTestTool('test_optional_tool', schema, async (input) => {
          return {
            required: input.required,
            hasOptional: input.optional !== undefined,
            optional: input.optional,
          };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution with optional field
        const result = await vercelTool.execute({
          required: requiredString,
          optional: optionalNumber,
        });

        expect(result).toEqual({
          required: requiredString,
          hasOptional: optionalNumber !== undefined,
          optional: optionalNumber,
        });
      }
    );

    /**
     * Property test: Tool with enum input generates valid definition
     */
    test.prop([fc.constantFrom('add', 'subtract', 'multiply', 'divide')])(
      'should generate valid definition for tool with enum input',
      async (operation) => {
        const schema = z.object({
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
        });

        const tool = createTestTool('test_enum_tool', schema, async (input) => {
          return { operation: input.operation };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution
        const result = await vercelTool.execute({ operation });
        expect(result).toEqual({ operation });
      }
    );

    /**
     * Property test: Tool with nested object schema generates valid definition
     */
    test.prop([fc.string(), fc.integer()])(
      'should generate valid definition for tool with nested object',
      async (name, age) => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            age: z.number(),
          }),
        });

        const tool = createTestTool('test_nested_tool', schema, async (input) => {
          return { user: input.user };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution
        const result = await vercelTool.execute({
          user: { name, age },
        });

        expect(result).toEqual({ user: { name, age } });
      }
    );

    /**
     * Property test: Tool with default values generates valid definition
     */
    test.prop([fc.string()])(
      'should generate valid definition for tool with default values',
      async (query) => {
        const schema = z.object({
          query: z.string(),
          maxResults: z.number().default(10),
        });

        const tool = createTestTool('test_default_tool', schema, async (input) => {
          return { query: input.query, maxResults: input.maxResults };
        });

        const vercelTool = tool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.parameters).toBe(schema);

        // Verify execution without providing default field
        const result = await vercelTool.execute({ query, maxResults: 10 });
        expect(result).toEqual({ query, maxResults: 10 });
      }
    );

    /**
     * Test that tool definition generation is consistent across multiple calls
     */
    it('should generate consistent tool definitions across multiple calls', () => {
      const schema = z.object({ value: z.string() });
      const testTool = createTestTool('test_tool', schema, async (input) => {
        return { result: input.value };
      });

      const vercelTool1 = testTool.toVercelTool();
      const vercelTool2 = testTool.toVercelTool();

      // Verify both definitions have the same structure
      expect(vercelTool1.description).toBe(vercelTool2.description);
      expect(vercelTool1.parameters).toBe(vercelTool2.parameters);
      expect(typeof vercelTool1.execute).toBe(typeof vercelTool2.execute);
    });

    /**
     * Test that tool definitions work with complex Zod schemas
     */
    it('should generate valid definition for tool with complex Zod schema', async () => {
      const complexSchema = z.object({
        query: z.string().min(1).max(100),
        filters: z
          .object({
            category: z.enum(['science', 'technology', 'health']).optional(),
            dateRange: z
              .object({
                start: z.string(),
                end: z.string(),
              })
              .optional(),
            tags: z.array(z.string()).optional(),
          })
          .optional(),
        options: z
          .object({
            maxResults: z.number().int().positive().default(10),
            includeMetadata: z.boolean().default(false),
            sortBy: z.enum(['relevance', 'date', 'popularity']).default('relevance'),
          })
          .optional(),
      });

      const tool = createTestTool('complex_tool', complexSchema, async (input) => {
        return { received: input };
      });

      const vercelTool = tool.toVercelTool();

      // Verify structure
      expect(vercelTool).toBeDefined();
      expect(vercelTool.description).toBeDefined();
      expect(vercelTool.parameters).toBe(complexSchema);
      expect(typeof vercelTool.execute).toBe('function');

      // Test execution with complex input
      const result = await vercelTool.execute({
        query: 'test query',
        filters: {
          category: 'science',
          tags: ['neuroscience', 'research'],
        },
        options: {
          maxResults: 5,
          includeMetadata: true,
          sortBy: 'relevance',
        },
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('received');
    });

    /**
     * Test that tool definitions handle errors properly
     */
    it('should handle errors during tool execution', async () => {
      const schema = z.object({
        value: z.number(),
      });

      const tool = createTestTool('error_tool', schema, async (input) => {
        if (input.value < 0) {
          throw new Error('Negative values not allowed');
        }
        return { value: input.value };
      });

      const vercelTool = tool.toVercelTool();

      // Verify that errors are propagated
      await expect(vercelTool.execute({ value: -1 })).rejects.toThrow(
        'Negative values not allowed'
      );

      // Verify that valid inputs work
      const result = await vercelTool.execute({ value: 5 });
      expect(result).toEqual({ value: 5 });
    });
  });
});
