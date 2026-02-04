/**
 * Property-Based Tests for Tool Input Validation
 *
 * Feature: typescript-backend-migration
 * Property 5: Tool Input Validation
 *
 * For any tool with a Zod schema, providing invalid inputs should result
 * in validation errors, and valid inputs should pass validation.
 *
 * Validates: Requirements 2.5
 *
 * This test verifies that:
 * 1. Tools properly validate inputs using Zod schemas
 * 2. Invalid inputs always fail validation with appropriate errors
 * 3. Valid inputs always pass validation
 * 4. Validation errors are descriptive and actionable
 * 5. Optional parameters work correctly with defaults
 */

import { describe, it, expect } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { z } from 'zod';
import { BaseTool, BaseContextVariables } from '@/lib/tools/base-tool';
import { ExampleTool } from '@/lib/tools/example-tool';
import { CalculatorTool } from '@/lib/tools/calculator-tool';

/**
 * Test tool with various input types for comprehensive validation testing
 */
const ComplexToolInputSchema = z.object({
  requiredString: z.string().min(1).describe('A required string field'),
  requiredNumber: z.number().int().positive().describe('A required positive integer'),
  optionalString: z.string().optional().describe('An optional string field'),
  optionalNumberWithDefault: z.number().default(10).describe('A number with default value'),
  enumField: z.enum(['option1', 'option2', 'option3']).describe('An enum field'),
  booleanField: z.boolean().describe('A boolean field'),
  arrayField: z.array(z.string()).min(1).describe('An array of strings'),
  nestedObject: z
    .object({
      nestedString: z.string(),
      nestedNumber: z.number(),
    })
    .describe('A nested object'),
});

class ComplexTool extends BaseTool<typeof ComplexToolInputSchema> {
  static readonly toolName = 'complex_tool';
  static readonly toolDescription = 'A tool with complex input validation';

  contextVariables: BaseContextVariables = {};
  inputSchema = ComplexToolInputSchema;

  async execute(input: z.infer<typeof ComplexToolInputSchema>): Promise<unknown> {
    return { validated: true, input };
  }
}

/**
 * Tool with strict string validation
 */
const StrictStringToolInputSchema = z.object({
  email: z.string().email().describe('A valid email address'),
  url: z.string().url().describe('A valid URL'),
  uuid: z.string().uuid().describe('A valid UUID'),
  minLength: z.string().min(5).describe('String with minimum length 5'),
  maxLength: z.string().max(10).describe('String with maximum length 10'),
  pattern: z.string().regex(/^[A-Z]{3}$/).describe('Three uppercase letters'),
});

class StrictStringTool extends BaseTool<typeof StrictStringToolInputSchema> {
  static readonly toolName = 'strict_string_tool';
  static readonly toolDescription = 'A tool with strict string validation';

  contextVariables: BaseContextVariables = {};
  inputSchema = StrictStringToolInputSchema;

  async execute(input: z.infer<typeof StrictStringToolInputSchema>): Promise<unknown> {
    return { validated: true, input };
  }
}

/**
 * Tool with numeric constraints
 */
const NumericToolInputSchema = z.object({
  positiveInt: z.number().int().positive().describe('A positive integer'),
  negativeInt: z.number().int().negative().describe('A negative integer'),
  inRange: z.number().min(0).max(100).describe('A number between 0 and 100'),
  multipleOf: z.number().multipleOf(5).describe('A number that is a multiple of 5'),
});

class NumericTool extends BaseTool<typeof NumericToolInputSchema> {
  static readonly toolName = 'numeric_tool';
  static readonly toolDescription = 'A tool with numeric validation';

  contextVariables: BaseContextVariables = {};
  inputSchema = NumericToolInputSchema;

  async execute(input: z.infer<typeof NumericToolInputSchema>): Promise<unknown> {
    return { validated: true, input };
  }
}

describe('Tool Input Validation Property Tests', () => {
  describe('Property 5: Tool Input Validation', () => {
    /**
     * **Validates: Requirements 2.5**
     *
     * Test that invalid inputs always fail validation
     */
    test.prop([
      fc.record({
        requiredString: fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.integer(),
          fc.boolean(),
          fc.array(fc.string())
        ),
      }),
    ])('should reject invalid input types for required string fields', async (invalidInput) => {
      const tool = new ComplexTool();

      // Property: Invalid inputs should always fail validation
      const result = tool.inputSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        // Verify error messages are descriptive
        expect(result.error.issues[0].message).toBeTruthy();
      }
    });

    /**
     * Test that invalid numbers fail validation
     */
    test.prop([
      fc.record({
        requiredNumber: fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.double({ min: -1000, max: 0 }), // Negative numbers
          fc.double({ noNaN: false }).filter((n) => isNaN(n)), // NaN
          fc.constant(Infinity),
          fc.constant(-Infinity)
        ),
      }),
    ])('should reject invalid numbers', async (invalidInput) => {
      const tool = new ComplexTool();

      const result = tool.inputSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    /**
     * Test that invalid enum values fail validation
     */
    test.prop([
      fc.record({
        enumField: fc.oneof(
          fc.string().filter((s) => !['option1', 'option2', 'option3'].includes(s)),
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined)
        ),
      }),
    ])('should reject invalid enum values', async (invalidInput) => {
      const tool = new ComplexTool();

      const result = tool.inputSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    /**
     * Test that invalid arrays fail validation
     */
    test.prop([
      fc.record({
        arrayField: fc.oneof(
          fc.constant([]), // Empty array (min 1 required)
          fc.string(),
          fc.integer(),
          fc.array(fc.integer()), // Array of wrong type
          fc.constant(null),
          fc.constant(undefined)
        ),
      }),
    ])('should reject invalid arrays', async (invalidInput) => {
      const tool = new ComplexTool();

      const result = tool.inputSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    /**
     * Test that valid inputs always pass validation
     */
    test.prop([
      fc.record({
        requiredString: fc.string({ minLength: 1 }),
        requiredNumber: fc.integer({ min: 1, max: 1000 }),
        optionalString: fc.option(fc.string(), { nil: undefined }),
        optionalNumberWithDefault: fc.option(fc.integer(), { nil: undefined }),
        enumField: fc.constantFrom('option1', 'option2', 'option3'),
        booleanField: fc.boolean(),
        arrayField: fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        nestedObject: fc.record({
          nestedString: fc.string(),
          nestedNumber: fc.integer(),
        }),
      }),
    ])('should accept valid inputs', async (validInput) => {
      const tool = new ComplexTool();

      // Property: Valid inputs should always pass validation
      const result = tool.inputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.requiredString).toBe(validInput.requiredString);
        expect(result.data.requiredNumber).toBe(validInput.requiredNumber);
        expect(result.data.enumField).toBe(validInput.enumField);
        expect(result.data.booleanField).toBe(validInput.booleanField);
        expect(result.data.arrayField).toEqual(validInput.arrayField);
        expect(result.data.nestedObject).toEqual(validInput.nestedObject);
      }
    });

    /**
     * Test that optional parameters work correctly
     */
    test.prop([
      fc.record({
        requiredString: fc.string({ minLength: 1 }),
        requiredNumber: fc.integer({ min: 1, max: 1000 }),
        enumField: fc.constantFrom('option1', 'option2', 'option3'),
        booleanField: fc.boolean(),
        arrayField: fc.array(fc.string(), { minLength: 1 }),
        nestedObject: fc.record({
          nestedString: fc.string(),
          nestedNumber: fc.integer(),
        }),
        // Omit optional fields
      }),
    ])('should handle missing optional parameters with defaults', async (inputWithoutOptionals) => {
      const tool = new ComplexTool();

      const result = tool.inputSchema.safeParse(inputWithoutOptionals);

      expect(result.success).toBe(true);
      if (result.success) {
        // Optional string should be undefined
        expect(result.data.optionalString).toBeUndefined();
        // Optional number with default should have default value
        expect(result.data.optionalNumberWithDefault).toBe(10);
      }
    });

    /**
     * Test ExampleTool validation
     */
    test.prop([
      fc.record({
        query: fc.string({ minLength: 1 }),
        maxResults: fc.integer({ min: 1, max: 100 }),
        includeMetadata: fc.option(fc.boolean(), { nil: undefined }),
      }),
    ])('should validate ExampleTool inputs correctly', async (validInput) => {
      const tool = new ExampleTool({
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
      });

      const result = tool.inputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe(validInput.query);
        expect(result.data.maxResults).toBe(validInput.maxResults);
      }
    });

    /**
     * Test CalculatorTool validation
     */
    test.prop([
      fc.record({
        operation: fc.constantFrom('add', 'subtract', 'multiply', 'divide'),
        a: fc.integer({ min: -1000, max: 1000 }),
        b: fc.integer({ min: -1000, max: 1000 }),
      }),
    ])('should validate CalculatorTool inputs correctly', async (validInput) => {
      const tool = new CalculatorTool();

      const result = tool.inputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe(validInput.operation);
        expect(result.data.a).toBe(validInput.a);
        expect(result.data.b).toBe(validInput.b);
      }
    });

    /**
     * Test that invalid calculator operations fail
     */
    test.prop([
      fc.record({
        operation: fc.string().filter(
          (s) => !['add', 'subtract', 'multiply', 'divide'].includes(s)
        ),
        a: fc.integer(),
        b: fc.integer(),
      }),
    ])('should reject invalid calculator operations', async (invalidInput) => {
      const tool = new CalculatorTool();

      const result = tool.inputSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    /**
     * Test strict string validation
     *
     * Note: We use simple email/URL patterns that are guaranteed to pass Zod validation.
     * fast-check's emailAddress() and webUrl() generators can produce RFC-compliant
     * values that Zod's stricter validation might reject.
     */
    test.prop([
      fc.record({
        email: fc
          .tuple(
            fc.stringMatching(/^[a-z0-9]+$/),
            fc.stringMatching(/^[a-z0-9]+$/),
            fc.constantFrom('com', 'org', 'net', 'edu')
          )
          .map(([local, domain, tld]) => `${local}@${domain}.${tld}`),
        url: fc
          .tuple(
            fc.constantFrom('http', 'https'),
            fc.stringMatching(/^[a-z0-9]+$/),
            fc.constantFrom('com', 'org', 'net')
          )
          .map(([protocol, domain, tld]) => `${protocol}://${domain}.${tld}`),
        uuid: fc.uuid(),
        minLength: fc.string({ minLength: 5, maxLength: 20 }),
        maxLength: fc.string({ minLength: 1, maxLength: 10 }),
        pattern: fc.constantFrom('ABC', 'DEF', 'XYZ', 'AAA', 'BBB'),
      }),
    ])('should validate strict string formats correctly', async (validInput) => {
      const tool = new StrictStringTool();

      const result = tool.inputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(validInput.email);
        expect(result.data.url).toBe(validInput.url);
        expect(result.data.uuid).toBe(validInput.uuid);
      }
    });

    /**
     * Test that invalid email addresses fail
     */
    test.prop([
      fc.string().filter((s) => !s.includes('@') || s.length < 3),
    ])('should reject invalid email addresses', async (invalidEmail) => {
      const tool = new StrictStringTool();

      const result = tool.inputSchema.safeParse({
        email: invalidEmail,
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        minLength: 'valid',
        maxLength: 'valid',
        pattern: 'ABC',
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test that strings violating length constraints fail
     */
    test.prop([
      fc.string({ maxLength: 4 }), // Too short (min 5)
    ])('should reject strings that are too short', async (shortString) => {
      const tool = new StrictStringTool();

      const result = tool.inputSchema.safeParse({
        email: 'test@example.com',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        minLength: shortString,
        maxLength: 'valid',
        pattern: 'ABC',
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test that strings violating max length fail
     */
    test.prop([
      fc.string({ minLength: 11, maxLength: 50 }), // Too long (max 10)
    ])('should reject strings that are too long', async (longString) => {
      const tool = new StrictStringTool();

      const result = tool.inputSchema.safeParse({
        email: 'test@example.com',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        minLength: 'valid',
        maxLength: longString,
        pattern: 'ABC',
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test numeric constraints
     */
    test.prop([
      fc.record({
        positiveInt: fc.integer({ min: 1, max: 1000 }),
        negativeInt: fc.integer({ min: -1000, max: -1 }),
        inRange: fc.integer({ min: 0, max: 100 }),
        multipleOf: fc.integer({ min: 1, max: 20 }).map((n) => n * 5),
      }),
    ])('should validate numeric constraints correctly', async (validInput) => {
      const tool = new NumericTool();

      const result = tool.inputSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.positiveInt).toBeGreaterThan(0);
        expect(result.data.negativeInt).toBeLessThan(0);
        expect(result.data.inRange).toBeGreaterThanOrEqual(0);
        expect(result.data.inRange).toBeLessThanOrEqual(100);
        expect(result.data.multipleOf % 5).toBe(0);
      }
    });

    /**
     * Test that non-positive integers fail positive validation
     */
    test.prop([
      fc.integer({ min: -1000, max: 0 }),
    ])('should reject non-positive integers for positive fields', async (nonPositive) => {
      const tool = new NumericTool();

      const result = tool.inputSchema.safeParse({
        positiveInt: nonPositive,
        negativeInt: -5,
        inRange: 50,
        multipleOf: 10,
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test that non-negative integers fail negative validation
     */
    test.prop([
      fc.integer({ min: 0, max: 1000 }),
    ])('should reject non-negative integers for negative fields', async (nonNegative) => {
      const tool = new NumericTool();

      const result = tool.inputSchema.safeParse({
        positiveInt: 5,
        negativeInt: nonNegative,
        inRange: 50,
        multipleOf: 10,
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test that out-of-range numbers fail
     */
    test.prop([
      fc.oneof(
        fc.integer({ min: -1000, max: -1 }),
        fc.integer({ min: 101, max: 1000 })
      ),
    ])('should reject numbers outside valid range', async (outOfRange) => {
      const tool = new NumericTool();

      const result = tool.inputSchema.safeParse({
        positiveInt: 5,
        negativeInt: -5,
        inRange: outOfRange,
        multipleOf: 10,
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test that non-multiples fail multipleOf validation
     */
    test.prop([
      fc.integer({ min: 1, max: 100 }).filter((n) => n % 5 !== 0),
    ])('should reject numbers that are not multiples of 5', async (nonMultiple) => {
      const tool = new NumericTool();

      const result = tool.inputSchema.safeParse({
        positiveInt: 5,
        negativeInt: -5,
        inRange: 50,
        multipleOf: nonMultiple,
      });

      expect(result.success).toBe(false);
    });

    /**
     * Test that validation errors contain useful information
     */
    it('should provide descriptive error messages for validation failures', () => {
      const tool = new ComplexTool();

      const result = tool.inputSchema.safeParse({
        requiredString: 123, // Wrong type
        requiredNumber: 'not a number', // Wrong type
        enumField: 'invalid_option', // Invalid enum
        booleanField: 'not a boolean', // Wrong type
        arrayField: 'not an array', // Wrong type
        nestedObject: 'not an object', // Wrong type
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have multiple errors
        expect(result.error.issues.length).toBeGreaterThan(0);

        // Each error should have a message
        result.error.issues.forEach((issue) => {
          expect(issue.message).toBeTruthy();
          expect(issue.path).toBeDefined();
        });

        // Should be able to format errors for user display
        const formatted = result.error.format();
        expect(formatted).toBeDefined();
      }
    });

    /**
     * Test that validation is consistent across multiple calls
     */
    test.prop([
      fc.record({
        requiredString: fc.string({ minLength: 1 }),
        requiredNumber: fc.integer({ min: 1 }),
        enumField: fc.constantFrom('option1', 'option2', 'option3'),
        booleanField: fc.boolean(),
        arrayField: fc.array(fc.string(), { minLength: 1 }),
        nestedObject: fc.record({
          nestedString: fc.string(),
          nestedNumber: fc.integer(),
        }),
      }),
    ])('should produce consistent validation results', async (input) => {
      const tool = new ComplexTool();

      // Validate the same input multiple times
      const result1 = tool.inputSchema.safeParse(input);
      const result2 = tool.inputSchema.safeParse(input);
      const result3 = tool.inputSchema.safeParse(input);

      // All results should be identical
      expect(result1.success).toBe(result2.success);
      expect(result2.success).toBe(result3.success);

      if (result1.success && result2.success && result3.success) {
        expect(result1.data).toEqual(result2.data);
        expect(result2.data).toEqual(result3.data);
      }
    });

    /**
     * Test that tool execution only happens with valid input
     */
    test.prop([
      fc.record({
        requiredString: fc.string({ minLength: 1 }),
        requiredNumber: fc.integer({ min: 1 }),
        enumField: fc.constantFrom('option1', 'option2', 'option3'),
        booleanField: fc.boolean(),
        arrayField: fc.array(fc.string(), { minLength: 1 }),
        nestedObject: fc.record({
          nestedString: fc.string(),
          nestedNumber: fc.integer(),
        }),
      }),
    ])('should only execute with validated input', async (validInput) => {
      const tool = new ComplexTool();

      // Validate input
      const validationResult = tool.inputSchema.safeParse(validInput);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        // Execute with validated input
        const executionResult = await tool.execute(validationResult.data);

        expect(executionResult).toBeDefined();
        expect((executionResult as any).validated).toBe(true);
        expect((executionResult as any).input).toEqual(validationResult.data);
      }
    });
  });
});
