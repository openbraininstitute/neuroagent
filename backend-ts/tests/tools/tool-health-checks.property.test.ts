/**
 * Property-Based Tests for Tool Health Checks
 *
 * Feature: typescript-backend-migration
 * Property 13: Tool Health Checks
 *
 * For any tool, calling its health check method should return a boolean
 * indicating its online status without throwing errors.
 *
 * Validates: Requirements 5.7
 *
 * This test verifies that:
 * 1. All tools have a working isOnline() method
 * 2. The method returns a boolean value
 * 3. The method does not throw errors during normal operation
 * 4. The method can be called multiple times safely
 * 5. Both instance and static health checks work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { z } from 'zod';
import { BaseTool, ToolRegistry, BaseContextVariables, ToolClass } from '@/lib/tools/base-tool';

// Test tool with default health check
class DefaultHealthCheckTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'default_health_tool';
  static readonly toolDescription = 'Tool with default health check';

  contextVariables = {};
  inputSchema = TestInputSchema;

  async execute(): Promise<unknown> {
    return { status: 'ok' };
  }
}

// Test tool with custom health check that always returns true
class AlwaysOnlineTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'always_online_tool';
  static readonly toolDescription = 'Tool that is always online';

  contextVariables = {};
  inputSchema = TestInputSchema;

  async execute(): Promise<unknown> {
    return { status: 'ok' };
  }

  override async isOnline(): Promise<boolean> {
    return true;
  }
}

// Test tool with custom health check that can be toggled
class ToggleableTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'toggleable_tool';
  static readonly toolDescription = 'Tool with toggleable health status';

  contextVariables = {};
  inputSchema = TestInputSchema;
  private online: boolean = true;

  setOnline(status: boolean): void {
    this.online = status;
  }

  async execute(): Promise<unknown> {
    return { status: 'ok' };
  }

  override async isOnline(): Promise<boolean> {
    return this.online;
  }
}

// Test tool with async health check (simulates network call)
class AsyncHealthCheckTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'async_health_tool';
  static readonly toolDescription = 'Tool with async health check';

  contextVariables = {};
  inputSchema = TestInputSchema;
  private delay: number = 10;

  setDelay(ms: number): void {
    this.delay = ms;
  }

  async execute(): Promise<unknown> {
    return { status: 'ok' };
  }

  override async isOnline(): Promise<boolean> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, this.delay));
    return true;
  }
}

// Test tool with static health check method
class StaticHealthCheckTool extends BaseTool<typeof TestInputSchema> {
  static readonly toolName = 'static_health_tool';
  static readonly toolDescription = 'Tool with static health check';

  static async isOnline(contextVariables: BaseContextVariables): Promise<boolean> {
    // Static health check can access context variables
    return true;
  }

  contextVariables = {};
  inputSchema = TestInputSchema;

  async execute(): Promise<unknown> {
    return { status: 'ok' };
  }
}

// Test tool that simulates health check based on context
class ContextDependentTool extends BaseTool<typeof TestInputSchema, TestContextVariables> {
  static readonly toolName = 'context_dependent_tool';
  static readonly toolDescription = 'Tool with context-dependent health check';

  static async isOnline(contextVariables: TestContextVariables): Promise<boolean> {
    // Health check depends on context variables
    return contextVariables.serviceAvailable === true;
  }

  contextVariables: TestContextVariables;

  constructor(contextVariables: TestContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  inputSchema = TestInputSchema;

  async execute(): Promise<unknown> {
    return { status: 'ok' };
  }

  override async isOnline(): Promise<boolean> {
    return this.contextVariables.serviceAvailable;
  }
}

// Test input schema
const TestInputSchema = z.object({
  input: z.string(),
});

// Test context variables
interface TestContextVariables extends BaseContextVariables {
  serviceAvailable: boolean;
}

// Arbitrary generator for boolean values
const booleanArb = fc.boolean();

// Arbitrary generator for tool instances
const toolInstanceArb = fc.constantFrom(
  new DefaultHealthCheckTool(),
  new AlwaysOnlineTool(),
  new ToggleableTool(),
  new AsyncHealthCheckTool()
);

// Arbitrary generator for tool classes
const toolClassArb = fc.constantFrom<ToolClass>(
  DefaultHealthCheckTool,
  AlwaysOnlineTool,
  ToggleableTool,
  AsyncHealthCheckTool,
  StaticHealthCheckTool,
  ContextDependentTool
);

describe('Tool Health Checks Property Tests', () => {
  describe('Property 13: Tool Health Checks', () => {
    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool instance, isOnline() should return a boolean
     */
    test.prop([toolInstanceArb], { numRuns: 100 })(
      'should return boolean for any tool instance',
      async (tool) => {
        const result = await tool.isOnline();

        expect(typeof result).toBe('boolean');
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool instance, isOnline() should not throw errors
     */
    test.prop([toolInstanceArb], { numRuns: 100 })(
      'should not throw errors during health check',
      async (tool) => {
        await expect(tool.isOnline()).resolves.toBeDefined();
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool instance, isOnline() can be called multiple times
     */
    test.prop([toolInstanceArb, fc.integer({ min: 1, max: 10 })], { numRuns: 100 })(
      'should handle multiple consecutive health checks',
      async (tool, callCount) => {
        const results: boolean[] = [];

        for (let i = 0; i < callCount; i++) {
          const result = await tool.isOnline();
          results.push(result);
        }

        // All results should be booleans
        expect(results.every((r) => typeof r === 'boolean')).toBe(true);

        // Results should be consistent for the same tool instance
        const firstResult = results[0];
        expect(results.every((r) => r === firstResult)).toBe(true);
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool with toggleable health, status changes should be reflected
     */
    test.prop([booleanArb], { numRuns: 100 })(
      'should reflect health status changes for toggleable tools',
      async (targetStatus) => {
        const tool = new ToggleableTool();

        tool.setOnline(targetStatus);
        const result = await tool.isOnline();

        expect(result).toBe(targetStatus);
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool with async health check, it should complete successfully
     */
    test.prop([fc.constant(new AsyncHealthCheckTool())], { numRuns: 100 })(
      'should handle async health checks',
      async (tool) => {
        // Set minimal delay to test async behavior without slowing tests
        tool.setDelay(0);

        const result = await tool.isOnline();

        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool class, static health check should work if defined
     */
    test.prop([toolClassArb], { numRuns: 100 })(
      'should support static health check methods',
      async (ToolClass) => {
        if (ToolClass.isOnline) {
          const result = await ToolClass.isOnline({});
          expect(typeof result).toBe('boolean');
        } else {
          // If no static method, that's also valid
          expect(ToolClass.isOnline).toBeUndefined();
        }
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any context-dependent tool, health check should respect context
     */
    test.prop([booleanArb], { numRuns: 100 })(
      'should respect context variables in health checks',
      async (serviceAvailable) => {
        const contextVariables: TestContextVariables = { serviceAvailable };
        const tool = new ContextDependentTool(contextVariables);

        const result = await tool.isOnline();

        expect(result).toBe(serviceAvailable);
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any tool in registry, health check should work
     */
    test.prop([toolClassArb], { numRuns: 100 })(
      'should work for tools registered in registry',
      async (ToolClass) => {
        const registry = new ToolRegistry();
        registry.registerClass(ToolClass);

        const contextVariables: TestContextVariables = { serviceAvailable: true };
        const healthMap = await registry.checkAllHealth(contextVariables);

        const toolName = ToolClass!.toolName;
        expect(healthMap.has(toolName)).toBe(true);
        expect(typeof healthMap.get(toolName)).toBe('boolean');
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: For any set of tools, batch health check should work
     */
    test.prop([fc.array(toolClassArb, { minLength: 1, maxLength: 5 })], { numRuns: 100 })(
      'should handle batch health checks for multiple tools',
      async (toolClasses) => {
        const registry = new ToolRegistry();

        // Register all tools (skip duplicates)
        const registeredNames = new Set<string>();
        for (const ToolClass of toolClasses) {
          if (!registeredNames.has(ToolClass!.toolName)) {
            registry.registerClass(ToolClass);
            registeredNames.add(ToolClass!.toolName);
          }
        }

        const contextVariables: TestContextVariables = { serviceAvailable: true };
        const healthMap = await registry.checkAllHealth(contextVariables);

        // All registered tools should have health status
        expect(healthMap.size).toBe(registeredNames.size);

        // All health statuses should be booleans
        for (const [name, status] of healthMap) {
          expect(typeof status).toBe('boolean');
          expect(registeredNames.has(name)).toBe(true);
        }
      }
    );

    /**
     * **Validates: Requirements 5.7**
     *
     * Property: Default health check should always return true
     */
    test.prop([fc.constant(new DefaultHealthCheckTool())], { numRuns: 100 })(
      'should return true for default health check implementation',
      async (tool) => {
        const result = await tool.isOnline();

        expect(result).toBe(true);
      }
    );
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle tools with no health check gracefully', async () => {
      const tool = new DefaultHealthCheckTool();

      // Should not throw
      await expect(tool.isOnline()).resolves.toBe(true);
    });

    it('should handle concurrent health checks', async () => {
      const tool = new AsyncHealthCheckTool();
      tool.setDelay(5); // Reduced from 50ms to 5ms

      // Call health check multiple times concurrently
      const promises = Array.from({ length: 10 }, () => tool.isOnline());
      const results = await Promise.all(promises);

      // All should succeed and return boolean
      expect(results.every((r) => typeof r === 'boolean')).toBe(true);
    });

    it('should handle registry health check with no context', async () => {
      const registry = new ToolRegistry();
      registry.registerClass(DefaultHealthCheckTool);
      registry.registerClass(AlwaysOnlineTool);

      // Should work without context variables
      const healthMap = await registry.checkAllHealth();

      expect(healthMap.size).toBe(2);
      expect(healthMap.get('default_health_tool')).toBe(true);
      expect(healthMap.get('always_online_tool')).toBe(true);
    });

    it('should handle empty registry health check', async () => {
      const registry = new ToolRegistry();

      const healthMap = await registry.checkAllHealth();

      expect(healthMap.size).toBe(0);
    });

    it('should handle rapid status changes', async () => {
      const tool = new ToggleableTool();

      // Rapidly toggle status
      for (let i = 0; i < 10; i++) {
        const status = i % 2 === 0;
        tool.setOnline(status);
        const result = await tool.isOnline();
        expect(result).toBe(status);
      }
    });

    it('should handle health check with static method', async () => {
      const contextVariables: TestContextVariables = { serviceAvailable: true };

      // Call static method directly
      const result = await StaticHealthCheckTool.isOnline(contextVariables);

      expect(result).toBe(true);
    });

    it('should handle health check with unavailable service', async () => {
      const contextVariables: TestContextVariables = { serviceAvailable: false };
      const tool = new ContextDependentTool(contextVariables);

      const result = await tool.isOnline();

      expect(result).toBe(false);
    });

    it('should maintain health check consistency across instances', async () => {
      const tool1 = new AlwaysOnlineTool();
      const tool2 = new AlwaysOnlineTool();

      const result1 = await tool1.isOnline();
      const result2 = await tool2.isOnline();

      // Different instances of the same tool class should have consistent behavior
      expect(result1).toBe(result2);
    });
  });

  describe('Integration with Tool Registry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should check health of all registered tools', async () => {
      registry.registerClass(DefaultHealthCheckTool);
      registry.registerClass(AlwaysOnlineTool);
      registry.registerClass(ToggleableTool);

      const healthMap = await registry.checkAllHealth();

      expect(healthMap.size).toBe(3);
      expect(healthMap.get('default_health_tool')).toBe(true);
      expect(healthMap.get('always_online_tool')).toBe(true);
      expect(healthMap.get('toggleable_tool')).toBe(true);
    });

    it('should handle mixed static and instance health checks', async () => {
      registry.registerClass(DefaultHealthCheckTool);
      registry.registerClass(StaticHealthCheckTool);

      const contextVariables: TestContextVariables = { serviceAvailable: true };
      const healthMap = await registry.checkAllHealth(contextVariables);

      expect(healthMap.size).toBe(2);
      expect(healthMap.get('default_health_tool')).toBe(true);
      expect(healthMap.get('static_health_tool')).toBe(true);
    });

    it('should handle context-dependent tools in registry', async () => {
      registry.registerClass(ContextDependentTool);

      // Test with service available
      const contextAvailable: TestContextVariables = { serviceAvailable: true };
      const healthMapAvailable = await registry.checkAllHealth(contextAvailable);
      expect(healthMapAvailable.get('context_dependent_tool')).toBe(true);

      // Test with service unavailable
      const contextUnavailable: TestContextVariables = { serviceAvailable: false };
      const healthMapUnavailable = await registry.checkAllHealth(contextUnavailable);
      expect(healthMapUnavailable.get('context_dependent_tool')).toBe(false);
    });
  });
});
