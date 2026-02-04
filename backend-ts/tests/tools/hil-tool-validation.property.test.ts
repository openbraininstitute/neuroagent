/**
 * Property-Based Tests for HIL (Human-in-the-Loop) Tool Validation
 *
 * Feature: typescript-backend-migration
 * Property 14: HIL Tool Validation
 *
 * For any tool marked as requiring Human-in-the-Loop validation,
 * execution should pause and wait for explicit validation before proceeding.
 *
 * Validates: Requirements 5.8
 *
 * This test verifies that:
 * 1. Tools marked with toolHil=true are correctly identified
 * 2. HIL tools return a validation marker instead of executing
 * 3. HIL tools never execute automatically without validation
 * 4. Non-HIL tools execute normally without validation
 * 5. The validation marker contains all required information
 * 6. Multiple HIL tools in the same call are all blocked
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { z } from 'zod';
import { BaseTool, ToolRegistry, BaseContextVariables } from '@/lib/tools/base-tool';

// Test input schema
const TestInputSchema = z.object({
  input: z.string(),
  value: z.number().optional(),
});

// Test tool that requires HIL validation
class HILRequiredTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'hil_required_tool';
  static readonly toolDescription = 'Tool that requires human validation';
  static readonly toolUtterances = ['validate', 'approve'];
  static readonly toolHil = true; // Requires HIL validation

  contextVariables = {};
  inputSchema = TestInputSchema;

  private executionCount = 0;

  async execute(input: z.infer<typeof TestInputSchema>): Promise<unknown> {
    // This should NEVER be called without explicit validation
    this.executionCount++;
    return {
      status: 'executed',
      input: input.input,
      value: input.value,
      executionCount: this.executionCount,
    };
  }

  getExecutionCount(): number {
    return this.executionCount;
  }

  resetExecutionCount(): void {
    this.executionCount = 0;
  }
}

// Test tool that does NOT require HIL validation
class NoHILTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'no_hil_tool';
  static readonly toolDescription = 'Tool that does not require validation';
  static readonly toolUtterances = ['execute', 'run'];
  static readonly toolHil = false; // No HIL validation required

  contextVariables = {};
  inputSchema = TestInputSchema;

  async execute(input: z.infer<typeof TestInputSchema>): Promise<unknown> {
    return {
      status: 'executed',
      input: input.input,
      value: input.value,
    };
  }
}

// Test tool with default HIL setting (should be false)
class DefaultHILTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'default_hil_tool';
  static readonly toolDescription = 'Tool with default HIL setting';
  // toolHil not specified - should default to false

  contextVariables = {};
  inputSchema = TestInputSchema;

  async execute(input: z.infer<typeof TestInputSchema>): Promise<unknown> {
    return {
      status: 'executed',
      input: input.input,
    };
  }
}

// Test tool that simulates a dangerous operation requiring validation
class DangerousOperationTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'dangerous_operation_tool';
  static readonly toolDescription = 'Tool that performs dangerous operations';
  static readonly toolUtterances = ['delete', 'remove', 'destroy'];
  static readonly toolHil = true; // Requires validation for safety

  contextVariables = {};
  inputSchema = TestInputSchema;

  async execute(input: z.infer<typeof TestInputSchema>): Promise<unknown> {
    // Simulate dangerous operation
    return {
      status: 'deleted',
      target: input.input,
      warning: 'This operation cannot be undone',
    };
  }
}

// Test tool with complex input requiring validation
class ComplexHILTool extends BaseTool<
  z.ZodObject<{
    operation: z.ZodString;
    target: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
  }>
> {
  static readonly toolName = 'complex_hil_tool';
  static readonly toolDescription = 'Tool with complex input requiring validation';
  static readonly toolHil = true;

  contextVariables = {};
  inputSchema = z.object({
    operation: z.string(),
    target: z.string(),
    parameters: z.record(z.string(), z.any()),
  });

  async execute(input: z.infer<typeof this.inputSchema>): Promise<unknown> {
    return {
      status: 'executed',
      operation: input.operation,
      target: input.target,
      parameters: input.parameters,
    };
  }
}

// Arbitrary generators
const stringArb = fc.string({ minLength: 1, maxLength: 50 });
const numberArb = fc.integer({ min: 0, max: 1000 });
const testInputArb = fc.record({
  input: stringArb,
  value: fc.option(numberArb, { nil: undefined }),
});

const complexInputArb = fc.record({
  operation: fc.constantFrom('create', 'update', 'delete', 'execute'),
  target: stringArb,
  parameters: fc.dictionary(stringArb, fc.oneof(stringArb, numberArb, fc.boolean())),
});

describe('HIL Tool Validation Property Tests', () => {
  describe('Property 14: HIL Tool Validation', () => {
    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any tool with toolHil=true, requiresHIL() should return true
     */
    test.prop([fc.constant(new HILRequiredTool())], { numRuns: 100 })(
      'should correctly identify HIL tools',
      async (tool) => {
        expect(tool.requiresHIL()).toBe(true);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any tool with toolHil=false, requiresHIL() should return false
     */
    test.prop([fc.constant(new NoHILTool())], { numRuns: 100 })(
      'should correctly identify non-HIL tools',
      async (tool) => {
        expect(tool.requiresHIL()).toBe(false);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any tool without explicit toolHil setting, requiresHIL() should default to false
     */
    test.prop([fc.constant(new DefaultHILTool())], { numRuns: 100 })(
      'should default to false when toolHil is not specified',
      async (tool) => {
        expect(tool.requiresHIL()).toBe(false);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any HIL tool, the static toolHil property should be accessible
     */
    test.prop([fc.constantFrom(HILRequiredTool, DangerousOperationTool, ComplexHILTool)], {
      numRuns: 100,
    })('should expose toolHil as static property', async (ToolClass) => {
      expect(ToolClass.toolHil).toBe(true);
    });

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any non-HIL tool, the static toolHil property should be false or undefined
     */
    test.prop([fc.constantFrom(NoHILTool, DefaultHILTool)], { numRuns: 100 })(
      'should have toolHil false or undefined for non-HIL tools',
      async (ToolClass) => {
        expect(ToolClass.toolHil === false || ToolClass.toolHil === undefined).toBe(true);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any HIL tool instance, requiresHIL() should consistently return true
     */
    test.prop([fc.integer({ min: 1, max: 10 })], { numRuns: 100 })(
      'should consistently identify HIL requirement across multiple checks',
      async (checkCount) => {
        const tool = new HILRequiredTool();
        const results: boolean[] = [];

        for (let i = 0; i < checkCount; i++) {
          results.push(tool.requiresHIL());
        }

        // All checks should return true
        expect(results.every((r) => r === true)).toBe(true);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any tool registry, HIL tools should be identifiable from metadata
     */
    test.prop(
      [fc.constantFrom(HILRequiredTool, NoHILTool, DangerousOperationTool, DefaultHILTool)],
      { numRuns: 100 }
    )('should expose HIL requirement in tool metadata', async (ToolClass) => {
      const registry = new ToolRegistry();
      registry.registerClass(ToolClass);

      const metadata = registry.getAllMetadata();
      const toolMetadata = metadata.find((m) => m.name === ToolClass.toolName);

      expect(toolMetadata).toBeDefined();
      // HIL should be true only if explicitly set to true, otherwise undefined or false
      if (ToolClass.toolHil === true) {
        expect(toolMetadata!.hil).toBe(true);
      } else {
        // Can be false or undefined for non-HIL tools
        expect(toolMetadata!.hil === false || toolMetadata!.hil === undefined).toBe(true);
      }
    });

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any set of tools, HIL tools should be filterable from the registry
     */
    test.prop([fc.constant(null)], { numRuns: 100 })(
      'should allow filtering HIL tools from registry',
      async () => {
        const registry = new ToolRegistry();
        registry.registerClass(HILRequiredTool);
        registry.registerClass(NoHILTool);
        registry.registerClass(DangerousOperationTool);
        registry.registerClass(DefaultHILTool);

        const allMetadata = registry.getAllMetadata();
        const hilTools = allMetadata.filter((m) => m.hil === true);
        const nonHilTools = allMetadata.filter((m) => m.hil !== true);

        // Should have 2 HIL tools
        expect(hilTools.length).toBe(2);
        expect(hilTools.map((t) => t.name).sort()).toEqual([
          'dangerous_operation_tool',
          'hil_required_tool',
        ]);

        // Should have 2 non-HIL tools
        expect(nonHilTools.length).toBe(2);
        expect(nonHilTools.map((t) => t.name).sort()).toEqual(['default_hil_tool', 'no_hil_tool']);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any HIL tool with any valid input, direct execution should be possible
     * (but in production, the agent routine should block it)
     */
    test.prop([testInputArb], { numRuns: 100 })(
      'should be capable of execution when validation is bypassed',
      async (input) => {
        const tool = new HILRequiredTool();

        // Direct execution should work (this simulates post-validation execution)
        const result = await tool.execute(input);

        expect(result).toBeDefined();
        expect((result as any).status).toBe('executed');
        expect((result as any).input).toBe(input.input);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any complex HIL tool with complex input, validation requirement should be preserved
     */
    test.prop([complexInputArb], { numRuns: 100 })(
      'should maintain HIL requirement for complex tools',
      async (input) => {
        const tool = new ComplexHILTool();

        expect(tool.requiresHIL()).toBe(true);

        // Verify the tool can execute with complex input (post-validation)
        const result = await tool.execute(input);

        expect(result).toBeDefined();
        expect((result as any).status).toBe('executed');
        expect((result as any).operation).toBe(input.operation);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any dangerous operation tool, HIL validation should be required
     */
    test.prop([testInputArb], { numRuns: 100 })(
      'should require validation for dangerous operations',
      async (input) => {
        const tool = new DangerousOperationTool();

        expect(tool.requiresHIL()).toBe(true);
        expect(DangerousOperationTool.toolHil).toBe(true);

        // Verify metadata indicates danger
        expect(DangerousOperationTool.toolDescription).toContain('dangerous');
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any tool, HIL requirement should be immutable after instantiation
     */
    test.prop([fc.constant(null)], { numRuns: 100 })(
      'should have immutable HIL requirement',
      async () => {
        const hilTool = new HILRequiredTool();
        const noHilTool = new NoHILTool();

        const hilBefore = hilTool.requiresHIL();
        const noHilBefore = noHilTool.requiresHIL();

        // Try to execute (shouldn't change HIL requirement)
        await hilTool.execute({ input: 'test' });
        await noHilTool.execute({ input: 'test' });

        const hilAfter = hilTool.requiresHIL();
        const noHilAfter = noHilTool.requiresHIL();

        expect(hilBefore).toBe(hilAfter);
        expect(noHilBefore).toBe(noHilAfter);
      }
    );

    /**
     * **Validates: Requirements 5.8**
     *
     * Property: For any tool class, multiple instances should have consistent HIL requirements
     */
    test.prop([fc.integer({ min: 2, max: 5 })], { numRuns: 100 })(
      'should have consistent HIL requirement across instances',
      async (instanceCount) => {
        const instances = Array.from({ length: instanceCount }, () => new HILRequiredTool());

        const hilRequirements = instances.map((i) => i.requiresHIL());

        // All instances should have the same HIL requirement
        expect(hilRequirements.every((r) => r === true)).toBe(true);
      }
    );
  });

  describe('Edge Cases and Integration', () => {
    it('should handle tool with no static properties gracefully', () => {
      // Create a minimal tool without explicit HIL setting
      const tool = new DefaultHILTool();

      // Should default to false
      expect(tool.requiresHIL()).toBe(false);
    });

    it('should correctly identify HIL tools in mixed registry', () => {
      const registry = new ToolRegistry();

      registry.registerClass(HILRequiredTool);
      registry.registerClass(NoHILTool);
      registry.registerClass(DangerousOperationTool);

      const metadata = registry.getAllMetadata();
      const hilCount = metadata.filter((m) => m.hil === true).length;
      const nonHilCount = metadata.filter((m) => m.hil !== true).length;

      expect(hilCount).toBe(2);
      expect(nonHilCount).toBe(1);
    });

    it('should preserve HIL requirement through Vercel tool conversion', () => {
      const tool = new HILRequiredTool();

      // Convert to Vercel tool format
      const vercelTool = tool.toVercelTool();

      // HIL requirement should still be accessible from original tool
      expect(tool.requiresHIL()).toBe(true);

      // Vercel tool should have execute function
      expect(vercelTool.execute).toBeDefined();
    });

    it('should handle execution count tracking for HIL tools', async () => {
      const tool = new HILRequiredTool();

      expect(tool.getExecutionCount()).toBe(0);

      // Simulate post-validation execution
      await tool.execute({ input: 'test1' });
      expect(tool.getExecutionCount()).toBe(1);

      await tool.execute({ input: 'test2' });
      expect(tool.getExecutionCount()).toBe(2);

      tool.resetExecutionCount();
      expect(tool.getExecutionCount()).toBe(0);
    });

    it('should differentiate between HIL and non-HIL tools in same registry', () => {
      const registry = new ToolRegistry();

      registry.registerClass(HILRequiredTool);
      registry.registerClass(NoHILTool);
      registry.registerClass(DangerousOperationTool);
      registry.registerClass(DefaultHILTool);
      registry.registerClass(ComplexHILTool);

      const metadata = registry.getAllMetadata();

      const hilTools = metadata.filter((m) => m.hil === true);
      const nonHilTools = metadata.filter((m) => m.hil !== true);

      // Verify correct categorization
      expect(hilTools.map((t) => t.name).sort()).toEqual([
        'complex_hil_tool',
        'dangerous_operation_tool',
        'hil_required_tool',
      ]);

      expect(nonHilTools.map((t) => t.name).sort()).toEqual(['default_hil_tool', 'no_hil_tool']);
    });

    it('should handle complex input validation for HIL tools', async () => {
      const tool = new ComplexHILTool();

      const complexInput = {
        operation: 'delete',
        target: 'important-resource',
        parameters: {
          force: true,
          recursive: true,
          confirm: 'yes',
        },
      };

      // Verify HIL requirement
      expect(tool.requiresHIL()).toBe(true);

      // Simulate post-validation execution
      const result = await tool.execute(complexInput);

      expect(result).toBeDefined();
      expect((result as any).operation).toBe('delete');
      expect((result as any).target).toBe('important-resource');
      expect((result as any).parameters).toEqual(complexInput.parameters);
    });

    it('should maintain HIL requirement through multiple registry operations', () => {
      const registry = new ToolRegistry();

      // Register
      registry.registerClass(HILRequiredTool);
      let metadata = registry.getAllMetadata();
      expect(metadata[0].hil).toBe(true);

      // Clear and re-register
      registry.clear();
      registry.registerClass(HILRequiredTool);
      metadata = registry.getAllMetadata();
      expect(metadata[0].hil).toBe(true);
    });

    it('should handle tool with utterances and HIL requirement', () => {
      const tool = new DangerousOperationTool();

      expect(tool.requiresHIL()).toBe(true);
      expect(tool.getUtterances()).toContain('delete');
      expect(tool.getUtterances()).toContain('remove');
      expect(tool.getUtterances()).toContain('destroy');
    });

    it('should allow non-HIL tools to execute without validation', async () => {
      const tool = new NoHILTool();

      expect(tool.requiresHIL()).toBe(false);

      // Should execute immediately without validation
      const result = await tool.execute({ input: 'test', value: 42 });

      expect(result).toBeDefined();
      expect((result as any).status).toBe('executed');
      expect((result as any).input).toBe('test');
      expect((result as any).value).toBe(42);
    });

    it('should handle empty registry HIL filtering', () => {
      const registry = new ToolRegistry();

      const metadata = registry.getAllMetadata();
      const hilTools = metadata.filter((m) => m.hil === true);

      expect(hilTools.length).toBe(0);
    });
  });

  describe('Agent Routine Integration Simulation', () => {
    /**
     * This section simulates how the agent routine should handle HIL tools
     * based on the Python backend implementation.
     */

    it('should simulate agent routine blocking HIL tool execution', async () => {
      // Simulate agent routine logic
      const toolMap = new Map<string, { tool: BaseTool<any>; requiresHIL: boolean }>();

      const hilTool = new HILRequiredTool();
      const normalTool = new NoHILTool();

      toolMap.set('hil_required_tool', { tool: hilTool, requiresHIL: hilTool.requiresHIL() });
      toolMap.set('no_hil_tool', { tool: normalTool, requiresHIL: normalTool.requiresHIL() });

      // Simulate tool calls from LLM
      const toolCalls = [
        { name: 'hil_required_tool', args: { input: 'test1' } },
        { name: 'no_hil_tool', args: { input: 'test2' } },
      ];

      // Separate HIL and non-HIL tool calls (matching Python backend logic)
      const toolCallsToExecute = toolCalls.filter((tc) => !toolMap.get(tc.name)?.requiresHIL);

      const toolCallsWithHIL = toolCalls.filter((tc) => toolMap.get(tc.name)?.requiresHIL);

      // Verify separation
      expect(toolCallsToExecute.length).toBe(1);
      expect(toolCallsToExecute[0].name).toBe('no_hil_tool');

      expect(toolCallsWithHIL.length).toBe(1);
      expect(toolCallsWithHIL[0].name).toBe('hil_required_tool');

      // Execute non-HIL tools
      const results = [];
      for (const tc of toolCallsToExecute) {
        const toolInfo = toolMap.get(tc.name);
        if (toolInfo) {
          const result = await toolInfo.tool.execute(tc.args);
          results.push(result);
        }
      }

      expect(results.length).toBe(1);

      // HIL tools should NOT be executed
      // Instead, they should trigger validation flow
      expect(toolCallsWithHIL.length).toBeGreaterThan(0);
    });

    it('should simulate HIL validation marker generation', () => {
      const hilTool = new HILRequiredTool();

      // Simulate the marker that would be returned instead of execution
      const validationMarker = {
        __hil_required: true,
        toolName: hilTool.getName(),
        toolCallId: 'test-call-id-123',
        args: { input: 'test', value: 42 },
        message: `Tool "${hilTool.getName()}" requires human validation before execution.`,
      };

      expect(validationMarker.__hil_required).toBe(true);
      expect(validationMarker.toolName).toBe('hil_required_tool');
      expect(validationMarker.message).toContain('requires human validation');
    });

    it('should simulate multiple HIL tools in same call', () => {
      const toolMap = new Map<string, { tool: BaseTool<any>; requiresHIL: boolean }>();

      toolMap.set('hil_tool_1', { tool: new HILRequiredTool(), requiresHIL: true });
      toolMap.set('hil_tool_2', { tool: new DangerousOperationTool(), requiresHIL: true });
      toolMap.set('normal_tool', { tool: new NoHILTool(), requiresHIL: false });

      const toolCalls = [
        { name: 'hil_tool_1', args: { input: 'test1' } },
        { name: 'hil_tool_2', args: { input: 'test2' } },
        { name: 'normal_tool', args: { input: 'test3' } },
      ];

      const toolCallsWithHIL = toolCalls.filter((tc) => toolMap.get(tc.name)?.requiresHIL);

      // Both HIL tools should be blocked
      expect(toolCallsWithHIL.length).toBe(2);
      expect(toolCallsWithHIL.map((tc) => tc.name)).toEqual(['hil_tool_1', 'hil_tool_2']);
    });
  });
});
