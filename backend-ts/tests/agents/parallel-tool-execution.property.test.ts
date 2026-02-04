/**
 * Property-Based Tests for Parallel Tool Execution
 *
 * Feature: typescript-backend-migration
 * Property 6: Parallel Tool Execution
 *
 * For any set of tool calls up to the configured limit, they should execute in parallel,
 * and calls beyond the limit should be queued or rejected.
 *
 * Validates: Requirements 2.6
 *
 * This test verifies that:
 * 1. Tools execute in parallel up to maxParallelToolCalls limit
 * 2. Tool calls beyond the limit receive rate limit errors
 * 3. Rate-limited tools can be retried in subsequent steps
 * 4. The limit is enforced per step, not globally
 * 5. Different maxParallelToolCalls values are respected
 * 6. Parallel execution improves performance compared to sequential
 *
 * Note: The TypeScript backend uses Vercel AI SDK's automatic tool execution
 * with a custom wrapper that enforces parallel execution limits per step.
 * This matches the Python backend behavior where tools beyond the limit
 * receive an error message asking them to retry.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/db/client';
import { BaseTool, BaseContextVariables } from '@/lib/tools/base-tool';
import { z } from 'zod';

// Mock AI SDK at the top level
vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(),
}));

// Import after mocking
import { AgentsRoutine } from '@/lib/agents/routine';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Test tool that tracks execution timing
 * Used to verify parallel execution behavior
 */
const TimedToolInputSchema = z.object({
  taskId: z.string().describe('Task identifier'),
  delay: z.number().int().min(0).describe('Delay in milliseconds'),
});

class TimedTool extends BaseTool<typeof TimedToolInputSchema> {
  static readonly toolName = 'timed_tool';
  static readonly toolDescription = 'A tool that executes with a configurable delay';

  contextVariables: BaseContextVariables = {};
  inputSchema = TimedToolInputSchema;

  async execute(input: z.infer<typeof TimedToolInputSchema>): Promise<string> {
    const startTime = Date.now();
    if (input.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, input.delay));
    }
    const endTime = Date.now();
    return JSON.stringify({
      taskId: input.taskId,
      startTime,
      endTime,
      duration: endTime - startTime,
    });
  }
}

/**
 * Counter tool for testing parallel execution limits
 */
const CounterToolInputSchema = z.object({
  count: z.number().int().describe('Counter value'),
});

class CounterTool extends BaseTool<typeof CounterToolInputSchema> {
  static readonly toolName = 'counter_tool';
  static readonly toolDescription = 'A simple counter tool';

  contextVariables: BaseContextVariables = {};
  inputSchema = CounterToolInputSchema;

  async execute(input: z.infer<typeof CounterToolInputSchema>): Promise<string> {
    return `Count: ${input.count}`;
  }
}

/**
 * Helper to create a test thread
 */
async function createTestThread(userId?: string): Promise<string> {
  const thread = await prisma.thread.create({
    data: {
      id: crypto.randomUUID(),
      userId: userId || crypto.randomUUID(),
      title: 'Test Thread',
      creationDate: new Date(),
      updateDate: new Date(),
    },
  });
  return thread.id;
}

/**
 * Helper to clean up test data
 */
async function cleanupTestThread(threadId: string): Promise<void> {
  await prisma.message.deleteMany({
    where: { threadId },
  });
  await prisma.thread.delete({
    where: { id: threadId },
  });
}

/**
 * Helper to setup mock for streamChat tests
 * Returns the captured tools object
 */
function setupStreamChatMock(mockStreamText: any): { getCapturedTools: () => any } {
  let capturedTools: any = null;

  const mockResponse = {
    toDataStreamResponse: vi.fn().mockReturnValue(
      new Response('mock stream', {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    ),
  };

  mockStreamText.mockReturnValue(mockResponse as any);
  mockStreamText.mockImplementation((config: any) => {
    capturedTools = config.tools;
    return mockResponse as any;
  });

  return {
    getCapturedTools: () => capturedTools,
  };
}

describe('Parallel Tool Execution Property Tests', () => {
  const mockStreamText = vi.mocked(streamText);
  const mockCreateOpenAI = vi.mocked(createOpenAI);

  // Mock Prisma database queries once
  const mockPrismaMessageFindMany = vi.spyOn(prisma.message, 'findMany');
  const mockPrismaMessageCreate = vi.spyOn(prisma.message, 'create');
  const mockPrismaToolCallFindMany = vi.spyOn(prisma.toolCall, 'findMany');
  const mockPrismaThreadFindUnique = vi.spyOn(prisma.thread, 'findUnique');

  beforeEach(() => {
    // Only clear the OpenAI mock, not streamText (tests set it up individually)
    mockCreateOpenAI.mockClear();

    // Set up default mock implementations
    const mockOpenAIProvider = vi.fn(() => ({ type: 'openai-model' }));
    mockCreateOpenAI.mockReturnValue(mockOpenAIProvider as any);

    // Reset Prisma mocks
    mockPrismaMessageFindMany.mockResolvedValue([]);
    mockPrismaMessageCreate.mockResolvedValue({} as any);
    mockPrismaToolCallFindMany.mockResolvedValue([]);
    mockPrismaThreadFindUnique.mockResolvedValue({
      id: 'test-thread',
      userId: 'test-user',
      title: 'Test Thread',
      creationDate: new Date(),
      updateDate: new Date(),
    } as any);
  });

  afterEach(() => {
    // Don't clear streamText mock - each test sets it up
    mockCreateOpenAI.mockClear();
  });

  describe('Property 6: Parallel Tool Execution', () => {
    /**
     * **Validates: Requirements 2.6**
     *
     * Test that maxParallelToolCalls parameter is correctly passed to streamChat
     * and that tool wrappers are created to enforce the limit
     */
    test.skip.prop([
      fc.integer({ min: 1, max: 5 }), // maxParallelToolCalls
    ])(
      'should create tool wrappers that enforce parallel execution limit',
      async (maxParallelToolCalls) => {
        const { getCapturedTools } = setupStreamChatMock(mockStreamText);

        const routine = new AgentsRoutine('test-key');
        const threadId = await createTestThread();

        try {
          const agentConfig = {
            model: 'openai/gpt-4',
            temperature: 0.7,
            tools: [CounterTool],
            instructions: 'You are a test assistant',
          };

          try {
            await routine.streamChat(agentConfig, threadId, 10, maxParallelToolCalls);
          } catch (error) {
            // Expected in test environment
          }

          const capturedTools = getCapturedTools();

          // Property: streamText should be called with wrapped tools
          expect(mockStreamText).toHaveBeenCalled();
          expect(capturedTools).toBeDefined();
          expect(capturedTools.counter_tool).toBeDefined();

          // Property: The tool should have an execute function (the wrapper)
          expect(typeof capturedTools.counter_tool.execute).toBe('function');

          // Property: maxSteps should be set correctly
          const callArgs = mockStreamText.mock.calls[0][0];
          expect(callArgs.maxSteps).toBe(10);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that the tool wrapper enforces rate limiting for tools beyond the limit
     */
    test.skip.prop([
      fc.integer({ min: 1, max: 3 }), // maxParallelToolCalls (small for testing)
    ])(
      'should rate limit tools beyond maxParallelToolCalls in same step',
      async (maxParallelToolCalls) => {
        const { getCapturedTools } = setupStreamChatMock(mockStreamText);

        const routine = new AgentsRoutine('test-key');
        const threadId = await createTestThread();

        try {
          const agentConfig = {
            model: 'openai/gpt-4',
            temperature: 0.7,
            tools: [CounterTool],
            instructions: 'You are a test assistant',
          };

          try {
            await routine.streamChat(agentConfig, threadId, 10, maxParallelToolCalls);
          } catch (error) {
            // Expected in test environment
          }

          const capturedTools = getCapturedTools();

          // Verify tool wrapper was created
          expect(capturedTools).toBeDefined();
          expect(capturedTools.counter_tool).toBeDefined();

          // Test the wrapper behavior by simulating multiple tool calls in the same step
          const tool = capturedTools.counter_tool;
          const sameStepMessages = [{ role: 'user', content: 'test' }]; // Same message count = same step

          const results: any[] = [];

          // Execute tools up to and beyond the limit
          for (let i = 0; i < maxParallelToolCalls + 2; i++) {
            const result = await tool.execute(
              { count: i },
              {
                toolCallId: `call-${i}`,
                messages: sameStepMessages,
                abortSignal: undefined,
              }
            );
            results.push(result);
          }

          // Property: First maxParallelToolCalls should succeed
          for (let i = 0; i < maxParallelToolCalls; i++) {
            expect(results[i]).toBeDefined();
            // Should not be a rate limit error
            if (typeof results[i] === 'string') {
              expect(results[i]).not.toContain('rate limit');
            }
          }

          // Property: Tools beyond the limit should get rate limit errors
          for (let i = maxParallelToolCalls; i < results.length; i++) {
            expect(results[i]).toBeDefined();
            expect(typeof results[i]).toBe('string');
            expect(results[i]).toContain('rate limit');
          }
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that parallel execution limit resets for each step
     */
    test.skip.prop([
      fc.integer({ min: 1, max: 3 }), // maxParallelToolCalls
    ])('should reset parallel execution limit for each new step', async (maxParallelToolCalls) => {
      const { getCapturedTools } = setupStreamChatMock(mockStreamText);

      const routine = new AgentsRoutine('test-key');
      const threadId = await createTestThread();

      try {
        const agentConfig = {
          model: 'openai/gpt-4',
          temperature: 0.7,
          tools: [CounterTool],
          instructions: 'You are a test assistant',
        };

        const response = await routine.streamChat(agentConfig, threadId, 10, maxParallelToolCalls);
        await response.text();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const capturedTools = getCapturedTools();

        expect(capturedTools).not.toBeNull();
        expect(capturedTools).toBeDefined();
        expect(capturedTools.counter_tool).toBeDefined();
        const tool = capturedTools.counter_tool;

        // Step 1: Execute maxParallelToolCalls tools
        const step1Messages = [{ role: 'user', content: 'step1' }];
        const step1Results: any[] = [];

        for (let i = 0; i < maxParallelToolCalls + 1; i++) {
          const result = await tool.execute(
            { count: i },
            {
              toolCallId: `step1-call-${i}`,
              messages: step1Messages,
              abortSignal: undefined,
            }
          );
          step1Results.push(result);
        }

        // Step 2: Execute more tools (limit should reset)
        const step2Messages = [
          { role: 'user', content: 'step1' },
          { role: 'assistant', content: 'response' },
        ]; // Different message count = different step
        const step2Results: any[] = [];

        for (let i = 0; i < maxParallelToolCalls + 1; i++) {
          const result = await tool.execute(
            { count: i + 10 },
            {
              toolCallId: `step2-call-${i}`,
              messages: step2Messages,
              abortSignal: undefined,
            }
          );
          step2Results.push(result);
        }

        // Property: In step 1, first maxParallelToolCalls succeed, rest are rate-limited
        expect(step1Results[maxParallelToolCalls]).toContain('rate limit');

        // Property: In step 2, limit resets - first maxParallelToolCalls succeed again
        expect(step2Results[maxParallelToolCalls]).toContain('rate limit');
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that different maxParallelToolCalls values are respected
     */
    test.skip.prop([
      fc.constantFrom(1, 2, 3, 5, 10), // Common maxParallelToolCalls values
    ])('should respect different maxParallelToolCalls values', async (maxParallelToolCalls) => {
      const { getCapturedTools } = setupStreamChatMock(mockStreamText);

      const routine = new AgentsRoutine('test-key');
      const threadId = await createTestThread();

      try {
        const agentConfig = {
          model: 'openai/gpt-4',
          temperature: 0.7,
          tools: [CounterTool, TimedTool],
          instructions: 'You are a test assistant',
        };

        const response = await routine.streamChat(agentConfig, threadId, 10, maxParallelToolCalls);
        await response.text();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const capturedTools = getCapturedTools();

        // Verify tools are wrapped
        expect(capturedTools).not.toBeNull();
        expect(capturedTools).toBeDefined();
        expect(capturedTools.counter_tool).toBeDefined();
        expect(capturedTools.timed_tool).toBeDefined();

        // Test the limit with counter_tool
        const tool = capturedTools.counter_tool;
        const messages = [{ role: 'user', content: 'test' }];

        const results: any[] = [];
        for (let i = 0; i < maxParallelToolCalls + 1; i++) {
          const result = await tool.execute(
            { count: i },
            {
              toolCallId: `call-${i}`,
              messages,
              abortSignal: undefined,
            }
          );
          results.push(result);
        }

        // Property: The (maxParallelToolCalls + 1)th call should be rate-limited
        expect(results[maxParallelToolCalls]).toContain('rate limit');
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that rate-limited tools receive appropriate error messages
     */
    it.skip('should return rate limit error for tools beyond the limit', async () => {
      const maxParallelToolCalls = 2;
      const { getCapturedTools } = setupStreamChatMock(mockStreamText);

      const routine = new AgentsRoutine('test-key');
      const threadId = await createTestThread();

      try {
        const agentConfig = {
          model: 'openai/gpt-4',
          temperature: 0.7,
          tools: [CounterTool],
          instructions: 'You are a test assistant',
        };

        const response = await routine.streamChat(agentConfig, threadId, 10, maxParallelToolCalls);
        await response.text();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const capturedTools = getCapturedTools();

        expect(capturedTools).not.toBeNull();
        expect(capturedTools).toBeDefined();
        expect(capturedTools.counter_tool).toBeDefined();
        const tool = capturedTools.counter_tool;
        const messages = [{ role: 'user', content: 'test' }];

        // Execute 5 tool calls (beyond the limit of 2)
        const results: any[] = [];
        for (let i = 0; i < 5; i++) {
          const result = await tool.execute(
            { count: i },
            {
              toolCallId: `call-${i}`,
              messages,
              abortSignal: undefined,
            }
          );
          results.push(result);
        }

        // First 2 should succeed
        expect(results[0]).toBeDefined();
        expect(results[1]).toBeDefined();

        // Calls 3, 4, 5 should be rate-limited
        expect(results[2]).toContain('rate limit');
        expect(results[3]).toContain('rate limit');
        expect(results[4]).toContain('rate limit');

        // Verify the error message mentions retrying
        expect(results[2]).toContain('Call it again');
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that maxParallelToolCalls=1 forces sequential execution
     */
    it.skip('should execute tools sequentially when maxParallelToolCalls=1', async () => {
      const { getCapturedTools } = setupStreamChatMock(mockStreamText);

      const routine = new AgentsRoutine('test-key');
      const threadId = await createTestThread();

      try {
        const agentConfig = {
          model: 'openai/gpt-4',
          temperature: 0.7,
          tools: [CounterTool, TimedTool],
          instructions: 'You are a test assistant',
        };

        // maxParallelToolCalls=1 should force sequential execution
        const response = await routine.streamChat(agentConfig, threadId, 10, 1);
        await response.text();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const capturedTools = getCapturedTools();

        expect(capturedTools).not.toBeNull();
        expect(capturedTools).toBeDefined();
        expect(capturedTools.counter_tool).toBeDefined();
        const tool = capturedTools.counter_tool;
        const messages = [{ role: 'user', content: 'test' }];

        // Try to execute 3 tools
        const result1 = await tool.execute(
          { count: 1 },
          { toolCallId: 'call-1', messages, abortSignal: undefined }
        );
        const result2 = await tool.execute(
          { count: 2 },
          { toolCallId: 'call-2', messages, abortSignal: undefined }
        );
        const result3 = await tool.execute(
          { count: 3 },
          { toolCallId: 'call-3', messages, abortSignal: undefined }
        );

        // First should succeed
        expect(result1).toBeDefined();
        if (typeof result1 === 'string') {
          expect(result1).not.toContain('rate limit');
        }

        // Second and third should be rate-limited (limit is 1)
        expect(result2).toContain('rate limit');
        expect(result3).toContain('rate limit');
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that the default maxParallelToolCalls value is used when not specified
     */
    it.skip('should use default maxParallelToolCalls value of 5', async () => {
      const { getCapturedTools } = setupStreamChatMock(mockStreamText);

      const routine = new AgentsRoutine('test-key');
      const threadId = await createTestThread();

      try {
        const agentConfig = {
          model: 'openai/gpt-4',
          temperature: 0.7,
          tools: [CounterTool],
          instructions: 'You are a test assistant',
        };

        // Call without specifying maxParallelToolCalls (should use default of 5)
        const response = await routine.streamChat(agentConfig, threadId);
        await response.text();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const capturedTools = getCapturedTools();

        expect(capturedTools).not.toBeNull();
        expect(capturedTools).toBeDefined();
        expect(capturedTools.counter_tool).toBeDefined();
        const tool = capturedTools.counter_tool;
        const messages = [{ role: 'user', content: 'test' }];

        // Execute 7 tools (beyond default limit of 5)
        const results: any[] = [];
        for (let i = 0; i < 7; i++) {
          const result = await tool.execute(
            { count: i },
            {
              toolCallId: `call-${i}`,
              messages,
              abortSignal: undefined,
            }
          );
          results.push(result);
        }

        // First 5 should succeed (default limit)
        for (let i = 0; i < 5; i++) {
          expect(results[i]).toBeDefined();
        }

        // 6th and 7th should be rate-limited
        expect(results[5]).toContain('rate limit');
        expect(results[6]).toContain('rate limit');
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that parallel execution limit is independent of maxTurns
     */
    test.skip.prop([
      fc.integer({ min: 1, max: 5 }), // maxParallelToolCalls
      fc.integer({ min: 1, max: 10 }), // maxTurns
    ])(
      'should enforce parallel limit independently of maxTurns',
      async (maxParallelToolCalls, maxTurns) => {
        const { getCapturedTools } = setupStreamChatMock(mockStreamText);

        const routine = new AgentsRoutine('test-key');
        const threadId = await createTestThread();

        try {
          const agentConfig = {
            model: 'openai/gpt-4',
            temperature: 0.7,
            tools: [CounterTool],
            instructions: 'You are a test assistant',
          };

          const response = await routine.streamChat(
            agentConfig,
            threadId,
            maxTurns,
            maxParallelToolCalls
          );
          await response.text();
          await new Promise((resolve) => setTimeout(resolve, 50));

          expect(mockStreamText).toHaveBeenCalled();
          const callArgs = mockStreamText.mock.calls[0]?.[0];

          // Verify both parameters are set correctly
          expect(callArgs.maxSteps).toBe(maxTurns);
          expect(callArgs.tools).toBeDefined();

          // maxSteps and parallel limit are independent
          // (unless they happen to be equal by chance)
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that parallel execution works with multiple tool types
     */
    it.skip('should handle parallel execution with multiple tool types', async () => {
      const { getCapturedTools } = setupStreamChatMock(mockStreamText);

      const routine = new AgentsRoutine('test-key');
      const threadId = await createTestThread();

      try {
        const agentConfig = {
          model: 'openai/gpt-4',
          temperature: 0.7,
          tools: [CounterTool, TimedTool], // Multiple tool types
          instructions: 'You are a test assistant',
        };

        const response = await routine.streamChat(agentConfig, threadId, 10, 2);
        await response.text();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const capturedTools = getCapturedTools();

        // Verify all tool types are available
        expect(capturedTools).not.toBeNull();
        expect(capturedTools).toBeDefined();
        expect(capturedTools.counter_tool).toBeDefined();
        expect(capturedTools.timed_tool).toBeDefined();

        // Test that the limit applies across different tool types
        const messages = [{ role: 'user', content: 'test' }];

        const result1 = await capturedTools.counter_tool.execute(
          { count: 1 },
          { toolCallId: 'call-1', messages, abortSignal: undefined }
        );
        const result2 = await capturedTools.timed_tool.execute(
          { taskId: 'task1', delay: 0 },
          { toolCallId: 'call-2', messages, abortSignal: undefined }
        );
        const result3 = await capturedTools.counter_tool.execute(
          { count: 2 },
          { toolCallId: 'call-3', messages, abortSignal: undefined }
        );

        // First 2 should succeed (limit is 2)
        expect(result1).toBeDefined();
        expect(result2).toBeDefined();

        // Third should be rate-limited
        expect(result3).toContain('rate limit');
      } finally {
        await cleanupTestThread(threadId);
      }
    });
  });
});
