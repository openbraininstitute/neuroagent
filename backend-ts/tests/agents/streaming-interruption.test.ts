/**
 * Tests for streaming interruption handling
 *
 * Verifies that when a client disconnects during streaming:
 * - The stream stops immediately (no background continuation)
 * - The abort signal listener is triggered
 * - Partial messages are saved to the database with is_complete=false
 * - Token consumption is tracked
 *
 * This matches the Python backend's asyncio.CancelledError handling behavior.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { streamText } from 'ai';
import { AgentsRoutine } from '../../src/lib/agents/routine';
import { prisma } from '../../src/lib/db/client';
import { Entity } from '../../src/types';

// Mock the AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

// Mock the database client
vi.mock('../../src/lib/db/client', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    toolCall: {
      findMany: vi.fn(),
    },
  },
}));

// Mock the system prompt
vi.mock('../../src/lib/agents/system-prompt', () => ({
  getSystemPrompt: vi.fn().mockResolvedValue('Test system prompt'),
}));

describe('Streaming Interruption Handling', () => {
  let routine: AgentsRoutine;
  let mockOnFinish: ((args: any) => Promise<void>) | undefined;
  let mockOnStepFinish: ((args: any) => Promise<void>) | undefined;
  let mockAbortSignal: AbortSignal;
  let abortController: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();

    routine = new AgentsRoutine('test-api-key');

    // Create a mock abort controller
    abortController = new AbortController();
    mockAbortSignal = abortController.signal;

    // Capture the onFinish and onStepFinish callbacks when streamText is called
    (streamText as any).mockImplementation((config: any) => {
      mockOnFinish = config.onFinish;
      mockOnStepFinish = config.onStepFinish;

      return {
        toDataStreamResponse: vi.fn().mockReturnValue(
          new Response('test stream', {
            headers: {
              'Content-Type': 'text/event-stream',
              'X-Vercel-AI-Data-Stream': 'v1',
            },
          })
        ),
      };
    });

    // Mock database queries
    (prisma.message.findMany as any).mockResolvedValue([
      {
        id: 'msg-1',
        threadId: 'thread-1',
        entity: Entity.USER,
        content: JSON.stringify({ role: 'user', content: 'Hello' }),
        creationDate: new Date(),
        isComplete: true,
        toolCalls: [],
      },
    ]);

    (prisma.message.create as any).mockResolvedValue({
      id: 'msg-2',
      threadId: 'thread-1',
      entity: Entity.AI_MESSAGE,
      content: JSON.stringify({ role: 'assistant', content: 'Hi there!' }),
      creationDate: new Date(),
      isComplete: true,
    });

    (prisma.toolCall.findMany as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should pass abortSignal to streamText', async () => {
    // Arrange
    const agent = {
      model: 'openai/gpt-4',
      temperature: 0.7,
      tools: [],
      instructions: 'Test instructions',
    };

    // Act
    await routine.streamChat(agent, 'thread-1', 10, 5, mockAbortSignal);

    // Assert
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: mockAbortSignal,
      })
    );
  });

  it('should save partial messages with is_complete=false when stream is aborted', async () => {
    // Arrange
    const agent = {
      model: 'openai/gpt-4',
      temperature: 0.7,
      tools: [],
      instructions: 'Test instructions',
    };

    // Act
    await routine.streamChat(agent, 'thread-1', 10, 5, abortController.signal);

    // Simulate a step finishing (updates partial state)
    await mockOnStepFinish!({
      response: {
        messages: [
          {
            role: 'assistant',
            content: 'This is a partial response that was interrupted',
          },
        ],
      },
      usage: {
        promptTokens: 20,
        completionTokens: 8,
        totalTokens: 28,
      },
    });

    // Trigger abort - this should save the partial message
    abortController.abort();

    // Wait for abort handler to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert - message should be saved with is_complete=false
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          threadId: 'thread-1',
          entity: Entity.AI_MESSAGE,
          content: expect.stringContaining('partial response'),
          isComplete: false, // Should be false when aborted
        }),
      })
    );
  });

  it('should save complete messages with is_complete=true when stream completes normally', async () => {
    // Arrange
    const agent = {
      model: 'openai/gpt-4',
      temperature: 0.7,
      tools: [],
      instructions: 'Test instructions',
    };

    // Create a non-aborted signal
    const abortController = new AbortController();
    const normalSignal = abortController.signal;

    // Act
    await routine.streamChat(agent, 'thread-1', 10, 5, normalSignal);

    // Simulate complete response
    await mockOnFinish!({
      response: {
        messages: [
          {
            role: 'assistant',
            content: 'This is a complete response',
          },
        ],
      },
      usage: {
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
      },
      finishReason: 'stop',
    });

    // Assert - message should be saved with is_complete=true
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          threadId: 'thread-1',
          entity: Entity.AI_MESSAGE,
          content: expect.stringContaining('complete response'),
          isComplete: true, // Should be true when not aborted
        }),
      })
    );
  });

  it('should track token consumption even when stream is interrupted', async () => {
    // Arrange
    const agent = {
      model: 'openai/gpt-4',
      temperature: 0.7,
      tools: [],
      instructions: 'Test instructions',
    };

    // Act
    await routine.streamChat(agent, 'thread-1', 10, 5, abortController.signal);

    // Simulate step completion with token usage
    await mockOnStepFinish!({
      response: {
        messages: [
          {
            role: 'assistant',
            content: 'Response',
          },
        ],
      },
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });

    // Trigger abort
    abortController.abort();

    // Wait for abort handler to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert - token consumption should be saved
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenConsumption: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                count: 100,
                model: 'openai/gpt-4',
              }),
              expect.objectContaining({
                count: 50,
                model: 'openai/gpt-4',
              }),
            ]),
          }),
        }),
      })
    );
  });

  it.skip('should save tool call messages with is_complete=false when stream is interrupted', async () => {
    // Arrange
    const mockTool = {
      toolName: 'test_tool',
      toVercelTool: () => ({
        description: 'Test tool',
        parameters: {},
        execute: vi.fn().mockResolvedValue('Tool result'),
      }),
      requiresHIL: () => false,
    };

    const agent = {
      model: 'openai/gpt-4',
      temperature: 0.7,
      tools: [mockTool],
      instructions: 'Test instructions',
    };

    // Create a fresh abort controller for this test
    const testAbortController = new AbortController();

    // Act
    await routine.streamChat(agent, 'thread-1', 10, 5, testAbortController.signal);

    // Simulate step with tool calls
    await mockOnStepFinish!({
      response: {
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Let me use a tool' },
              {
                type: 'tool-call',
                toolCallId: 'tc-1',
                toolName: 'test_tool',
                args: { param: 'value' },
              },
            ],
          },
        ],
      },
      usage: {
        promptTokens: 50,
        completionTokens: 25,
        totalTokens: 75,
      },
    });

    // Trigger abort
    testAbortController.abort();

    // Wait for abort handler
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert - assistant message with tool call should be saved with is_complete=false
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entity: Entity.AI_TOOL,
          isComplete: false, // Should be false when aborted
          toolCalls: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                id: 'tc-1',
                name: 'test_tool',
              }),
            ]),
          }),
        }),
      })
    );
  });

  it('should handle errors in onFinish gracefully', async () => {
    // Arrange
    const agent = {
      model: 'openai/gpt-4',
      temperature: 0.7,
      tools: [],
      instructions: 'Test instructions',
    };

    // Mock database error
    (prisma.message.create as any).mockRejectedValue(new Error('Database error'));

    // Act & Assert
    await routine.streamChat(agent, 'thread-1');

    // Simulate onFinish being called
    await expect(
      mockOnFinish!({
        response: {
          messages: [
            {
              role: 'assistant',
              content: 'Response',
            },
          ],
        },
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      })
    ).rejects.toThrow('Database error');
  });
});
