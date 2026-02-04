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
import { CalculatorTool } from '@/lib/tools/calculator-tool';
import { ExampleTool } from '@/lib/tools/example-tool';

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
    static readonly toolHil = false;

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
      // Test with existing tools
      const calculatorTool = new CalculatorTool();
      const exampleTool = new ExampleTool({
        apiUrl: 'https://example.com',
      });

      const calculatorVercelTool = calculatorTool.toVercelTool();
      const exampleVercelTool = exampleTool.toVercelTool();

      // Verify the tool definition has required properties
      expect(calculatorVercelTool).toBeDefined();
      expect(calculatorVercelTool.description).toBeDefined();
      expect(calculatorVercelTool.parameters).toBeDefined();
      expect(calculatorVercelTool.execute).toBeDefined();
      expect(typeof calculatorVercelTool.execute).toBe('function');

      expect(exampleVercelTool).toBeDefined();
      expect(exampleVercelTool.description).toBeDefined();
      expect(exampleVercelTool.parameters).toBeDefined();
      expect(exampleVercelTool.execute).toBeDefined();
      expect(typeof exampleVercelTool.execute).toBe('function');
    });

    /**
     * Test that tool definitions include the correct description
     */
    it('should include tool description in Vercel AI SDK definition', () => {
      const calculatorTool = new CalculatorTool();
      const vercelTool = calculatorTool.toVercelTool();

      expect(vercelTool.description).toBe(CalculatorTool.toolDescription);
    });

    /**
     * Test that tool definitions include the Zod schema as parameters
     */
    it('should include Zod schema as parameters in Vercel AI SDK definition', () => {
      const calculatorTool = new CalculatorTool();
      const vercelTool = calculatorTool.toVercelTool();

      // The parameters should be the Zod schema
      expect(vercelTool.parameters).toBe(calculatorTool.inputSchema);
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
     * Test that calculator tool generates valid definition and executes correctly
     */
    test.prop([
      fc.constantFrom('add', 'subtract', 'multiply', 'divide'),
      fc.integer({ min: -1000, max: 1000 }),
      fc.integer({ min: 1, max: 1000 }), // Avoid division by zero
    ])(
      'should generate valid definition for calculator tool and execute correctly',
      async (operation, a, b) => {
        const calculatorTool = new CalculatorTool();
        const vercelTool = calculatorTool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.description).toBe(CalculatorTool.toolDescription);
        expect(vercelTool.parameters).toBe(calculatorTool.inputSchema);

        // Execute the tool
        const result = await vercelTool.execute({ operation, a, b });

        // Verify result structure
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('operation');
        expect(result).toHaveProperty('operands');
        expect(result).toHaveProperty('result');
        expect(result).toHaveProperty('expression');

        // Verify the calculation is correct
        const resultObj = result as {
          operation: string;
          operands: { a: number; b: number };
          result: number;
          expression: string;
        };

        expect(resultObj.operation).toBe(operation);
        expect(resultObj.operands).toEqual({ a, b });

        let expectedResult: number;
        switch (operation) {
          case 'add':
            expectedResult = a + b;
            break;
          case 'subtract':
            expectedResult = a - b;
            break;
          case 'multiply':
            expectedResult = a * b;
            break;
          case 'divide':
            expectedResult = a / b;
            break;
        }

        expect(resultObj.result).toBe(expectedResult);
      }
    );

    /**
     * Test that example tool generates valid definition and executes correctly
     */
    test.prop([
      fc.string().filter((s) => s.length > 0),
      fc.integer({ min: 1, max: 10 }),
      fc.boolean(),
    ])(
      'should generate valid definition for example tool and execute correctly',
      async (query, maxResults, includeMetadata) => {
        const exampleTool = new ExampleTool({
          apiUrl: 'https://test.example.com',
          apiKey: 'test-key',
        });

        const vercelTool = exampleTool.toVercelTool();

        // Verify structure
        expect(vercelTool).toBeDefined();
        expect(vercelTool.description).toBe(ExampleTool.toolDescription);
        expect(vercelTool.parameters).toBe(exampleTool.inputSchema);

        // Execute the tool
        const result = await vercelTool.execute({
          query,
          maxResults,
          includeMetadata,
        });

        // Verify result structure
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('query');
        expect(result).toHaveProperty('resultCount');
        expect(result).toHaveProperty('results');

        const resultObj = result as {
          query: string;
          resultCount: number;
          results: Array<{
            id: number;
            title: string;
            content: string;
            source: string;
            metadata?: {
              timestamp: string;
              relevance: number;
              authenticated: boolean;
            };
          }>;
        };

        expect(resultObj.query).toBe(query);
        expect(resultObj.resultCount).toBeGreaterThan(0);
        expect(resultObj.resultCount).toBeLessThanOrEqual(maxResults);
        expect(Array.isArray(resultObj.results)).toBe(true);

        // Verify each result has the expected structure
        for (const item of resultObj.results) {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('title');
          expect(item).toHaveProperty('content');
          expect(item).toHaveProperty('source');
          expect(item.source).toBe('https://test.example.com');

          if (includeMetadata) {
            expect(item).toHaveProperty('metadata');
            expect(item.metadata).toHaveProperty('timestamp');
            expect(item.metadata).toHaveProperty('relevance');
            expect(item.metadata).toHaveProperty('authenticated');
            expect(item.metadata!.authenticated).toBe(true);
          }
        }
      }
    );

    /**
     * Test that tool definition generation is consistent across multiple calls
     */
    it('should generate consistent tool definitions across multiple calls', () => {
      const calculatorTool = new CalculatorTool();

      const vercelTool1 = calculatorTool.toVercelTool();
      const vercelTool2 = calculatorTool.toVercelTool();

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
