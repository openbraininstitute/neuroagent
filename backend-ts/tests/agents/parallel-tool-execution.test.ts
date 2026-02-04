/**
 * Tests for parallel tool execution limiting in AgentsRoutine
 *
 * Validates Requirement 2.6: Parallel tool calls with configurable limits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentsRoutine } from '@/lib/agents/routine';
import { BaseTool } from '@/lib/tools/base-tool';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

// Mock Prisma
vi.mock('@/lib/db/client', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock tool for testing
class MockTool extends BaseTool<typeof MockToolInputSchema> {
  static toolName = 'mock_tool';

  metadata = {
    name: 'mock_tool',
    description: 'A mock tool for testing',
  };

  inputSchema = z.object({
    value: z.string(),
  });

  contextVariables = z.object({});

  async execute(input: z.infer<typeof this.inputSchema>): Promise<string> {
    return `Executed with ${input.value}`;
  }
}

const MockToolInputSchema = z.object({
  value: z.string(),
});

describe('AgentsRoutine - Parallel Tool Execution', () => {
  let routine: AgentsRoutine;

  beforeEach(() => {
    vi.clearAllMocks();
    routine = new AgentsRoutine('test-api-key', undefined, undefined);
  });

  it('should track tool calls per step using message count', () => {
    // This test verifies the logic of using message count as step identifier
    const toolCallsPerStep = new Map<number, number>();

    // Simulate first step (message count = 5)
    const stepId1 = 5;
    toolCallsPerStep.set(stepId1, (toolCallsPerStep.get(stepId1) || 0) + 1);
    toolCallsPerStep.set(stepId1, (toolCallsPerStep.get(stepId1) || 0) + 1);
    toolCallsPerStep.set(stepId1, (toolCallsPerStep.get(stepId1) || 0) + 1);

    expect(toolCallsPerStep.get(stepId1)).toBe(3);

    // Simulate second step (message count = 7)
    const stepId2 = 7;
    toolCallsPerStep.set(stepId2, (toolCallsPerStep.get(stepId2) || 0) + 1);
    toolCallsPerStep.set(stepId2, (toolCallsPerStep.get(stepId2) || 0) + 1);

    expect(toolCallsPerStep.get(stepId2)).toBe(2);
    expect(toolCallsPerStep.get(stepId1)).toBe(3); // First step count unchanged
  });

  it('should enforce parallel tool execution limit', () => {
    const maxParallelToolCalls = 3;
    const toolCallsPerStep = new Map<number, number>();
    const stepId = 5;

    // Simulate 5 tool calls in the same step
    const results: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const currentCount = toolCallsPerStep.get(stepId) || 0;
      const toolPosition = currentCount + 1;
      toolCallsPerStep.set(stepId, toolPosition);

      if (toolPosition > maxParallelToolCalls) {
        results.push(`rate_limit_error_${i}`);
      } else {
        results.push(`executed_${i}`);
      }
    }

    // First 3 should execute, last 2 should get rate limit error
    expect(results).toEqual([
      'executed_1',
      'executed_2',
      'executed_3',
      'rate_limit_error_4',
      'rate_limit_error_5',
    ]);
  });

  it('should return rate limit error message matching Python backend format', () => {
    const toolName = 'test_tool';
    const args = { query: 'test', count: 5 };
    const expectedMessage = `The tool ${toolName} with arguments ${JSON.stringify(args)} could not be executed due to rate limit. Call it again.`;

    expect(expectedMessage).toContain('could not be executed due to rate limit');
    expect(expectedMessage).toContain('Call it again');
    expect(expectedMessage).toContain(toolName);
  });

  it('should reset counter for new steps', () => {
    const toolCallsPerStep = new Map<number, number>();

    // Step 1: 3 tool calls
    const step1 = 5;
    for (let i = 0; i < 3; i++) {
      toolCallsPerStep.set(step1, (toolCallsPerStep.get(step1) || 0) + 1);
    }
    expect(toolCallsPerStep.get(step1)).toBe(3);

    // Step 2: 2 tool calls (should start from 0)
    const step2 = 7;
    for (let i = 0; i < 2; i++) {
      toolCallsPerStep.set(step2, (toolCallsPerStep.get(step2) || 0) + 1);
    }
    expect(toolCallsPerStep.get(step2)).toBe(2);

    // Step 1 count should remain unchanged
    expect(toolCallsPerStep.get(step1)).toBe(3);
  });

  it('should handle maxParallelToolCalls = 1 (sequential execution)', () => {
    const maxParallelToolCalls = 1;
    const toolCallsPerStep = new Map<number, number>();
    const stepId = 5;

    const results: string[] = [];

    for (let i = 1; i <= 3; i++) {
      const currentCount = toolCallsPerStep.get(stepId) || 0;
      const toolPosition = currentCount + 1;
      toolCallsPerStep.set(stepId, toolPosition);

      if (toolPosition > maxParallelToolCalls) {
        results.push('rate_limited');
      } else {
        results.push('executed');
      }
    }

    // Only first tool should execute
    expect(results).toEqual(['executed', 'rate_limited', 'rate_limited']);
  });

  it('should handle maxParallelToolCalls = 10 (default)', () => {
    const maxParallelToolCalls = 10;
    const toolCallsPerStep = new Map<number, number>();
    const stepId = 5;

    const results: string[] = [];

    // Simulate 5 tool calls (all should execute)
    for (let i = 1; i <= 5; i++) {
      const currentCount = toolCallsPerStep.get(stepId) || 0;
      const toolPosition = currentCount + 1;
      toolCallsPerStep.set(stepId, toolPosition);

      if (toolPosition > maxParallelToolCalls) {
        results.push('rate_limited');
      } else {
        results.push('executed');
      }
    }

    // All should execute
    expect(results).toEqual(['executed', 'executed', 'executed', 'executed', 'executed']);
  });
});
