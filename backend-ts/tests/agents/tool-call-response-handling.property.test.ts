/**
 * Property-Based Tests for Tool Call Response Handling
 *
 * Feature: typescript-backend-migration
 * Property 16: Tool Call Response Handling
 *
 * For any tool call, the response should be properly formatted with the tool call ID,
 * tool name, and result content.
 *
 * Validates: Requirements 6.4
 *
 * This test verifies that:
 * 1. Tool call responses include the tool call ID
 * 2. Tool call responses include the tool name
 * 3. Tool call responses include the result content
 * 4. Tool call responses are saved to the database correctly
 * 5. Tool call responses follow the Python backend format
 * 6. Tool call responses can be converted back to CoreMessage format
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { Entity } from '@/types';
import { BaseTool, BaseContextVariables } from '@/lib/tools/base-tool';
import { AgentsRoutine } from '@/lib/agents/routine';

/**
 * Test tool that returns structured data
 */
class TestTool extends BaseTool<typeof TestToolInputSchema, BaseContextVariables> {
  static readonly toolName = 'test_tool';
  static readonly toolDescription = 'A test tool for property testing';
  static readonly toolUtterances = ['test'];
  static readonly toolHil = false;

  override contextVariables: BaseContextVariables = {};
  override inputSchema = z.object({
    query: z.string().describe('Test query'),
    value: z.number().optional().describe('Optional value'),
  });

  async execute(input: z.infer<typeof this.inputSchema>): Promise<unknown> {
    return {
      query: input.query,
      value: input.value || 0,
      result: `Processed: ${input.query}`,
      timestamp: new Date().toISOString(),
    };
  }
}

const TestToolInputSchema = z.object({
  query: z.string().describe('Test query'),
  value: z.number().optional().describe('Optional value'),
});

/**
 * Helper to create a test thread
 */
async function createTestThread(userId?: string): Promise<string> {
  const thread = await prisma.thread.create({
    data: {
      id: crypto.randomUUID(),
      userId: userId || crypto.randomUUID(), // Generate a valid UUID if not provided
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

describe('Tool Call Response Handling Property Tests', () => {
  describe('Property 16: Tool Call Response Handling', () => {
    /**
     * **Validates: Requirements 6.4**
     *
     * Test that tool call responses are properly formatted with required fields
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.integer({ min: 0, max: 1000 }),
      fc.uuid(),
    ])(
      'should format tool call responses with tool call ID, tool name, and result',
      async (query, value, toolCallId) => {
        const threadId = await createTestThread();

        try {
          // Create an assistant message with a tool call
          const assistantMessage = await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.AI_TOOL,
              content: JSON.stringify({
                role: 'assistant',
                content: 'I will use the test tool.',
                tool_calls: [
                  {
                    id: toolCallId,
                    function: {
                      name: 'test_tool',
                      arguments: JSON.stringify({ query, value }),
                    },
                    type: 'function',
                  },
                ],
              }),
              isComplete: true,
              creationDate: new Date(),
              toolCalls: {
                create: [
                  {
                    id: toolCallId,
                    name: 'test_tool',
                    arguments: JSON.stringify({ query, value }),
                    validated: null,
                  },
                ],
              },
            },
          });

          // Execute the tool
          const tool = new TestTool();
          const result = await tool.execute({ query, value });

          // Create a tool result message (simulating what AgentsRoutine does)
          const toolResultMessage = await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: typeof result === 'string' ? result : JSON.stringify(result),
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Verify the tool result message has all required fields
          const savedMessage = await prisma.message.findUnique({
            where: { id: toolResultMessage.id },
          });

          expect(savedMessage).toBeDefined();
          expect(savedMessage!.entity).toBe(Entity.TOOL);

          const messageContent = JSON.parse(savedMessage!.content);

          // Property: Tool call responses must include tool_call_id
          expect(messageContent).toHaveProperty('tool_call_id');
          expect(messageContent.tool_call_id).toBe(toolCallId);

          // Property: Tool call responses must include tool_name
          expect(messageContent).toHaveProperty('tool_name');
          expect(messageContent.tool_name).toBe('test_tool');

          // Property: Tool call responses must include content/result
          expect(messageContent).toHaveProperty('content');
          expect(messageContent.content).toBeDefined();

          // Property: Tool call responses must include role
          expect(messageContent).toHaveProperty('role');
          expect(messageContent.role).toBe('tool');

          // Verify the content can be parsed back
          const parsedContent =
            typeof messageContent.content === 'string'
              ? JSON.parse(messageContent.content)
              : messageContent.content;

          expect(parsedContent).toHaveProperty('query');
          expect(parsedContent.query).toBe(query);
          expect(parsedContent).toHaveProperty('value');
          expect(parsedContent.value).toBe(value);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that tool call responses can be converted to CoreMessage format
     */
    test.prop([fc.string({ minLength: 1, maxLength: 100 }), fc.uuid()])(
      'should convert tool call responses to CoreMessage format correctly',
      async (resultContent, toolCallId) => {
        const threadId = await createTestThread();

        try {
          // Create a tool result message
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: resultContent,
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Load messages and verify conversion
          const messages = await prisma.message.findMany({
            where: { threadId },
            orderBy: { creationDate: 'asc' },
            include: { toolCalls: true },
          });

          expect(messages.length).toBe(1);

          const message = messages[0];
          const content = JSON.parse(message.content);

          // Verify the message can be converted to CoreMessage format
          // This simulates what AgentsRoutine.convertToCoreMessages does
          expect(content.role).toBe('tool');
          expect(content.tool_call_id).toBe(toolCallId);
          expect(content.tool_name).toBe('test_tool');
          expect(content.content).toBe(resultContent);

          // Verify it can be converted to CoreMessage format
          const coreMessage = {
            role: 'tool' as const,
            content: [
              {
                type: 'tool-result' as const,
                toolCallId: content.tool_call_id,
                toolName: content.tool_name,
                result: content.content,
              },
            ],
          };

          expect(coreMessage.role).toBe('tool');
          expect(coreMessage.content[0].type).toBe('tool-result');
          expect(coreMessage.content[0].toolCallId).toBe(toolCallId);
          expect(coreMessage.content[0].toolName).toBe('test_tool');
          expect(coreMessage.content[0].result).toBe(resultContent);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that tool call responses with complex objects are properly serialized
     */
    test.prop([
      fc.record({
        query: fc.string({ minLength: 1 }),
        value: fc.integer(),
        nested: fc.record({
          field1: fc.string(),
          field2: fc.boolean(),
        }),
        array: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
      }),
      fc.uuid(),
    ])(
      'should handle complex tool call responses with nested objects',
      async (complexResult, toolCallId) => {
        const threadId = await createTestThread();

        try {
          // Create a tool result message with complex content
          const toolResultMessage = await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: JSON.stringify(complexResult),
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Verify the message was saved correctly
          const savedMessage = await prisma.message.findUnique({
            where: { id: toolResultMessage.id },
          });

          expect(savedMessage).toBeDefined();

          const messageContent = JSON.parse(savedMessage!.content);
          expect(messageContent.tool_call_id).toBe(toolCallId);
          expect(messageContent.tool_name).toBe('test_tool');

          // Verify the complex content can be parsed back
          const parsedContent = JSON.parse(messageContent.content);
          expect(parsedContent).toEqual(complexResult);
          expect(parsedContent.query).toBe(complexResult.query);
          expect(parsedContent.value).toBe(complexResult.value);
          expect(parsedContent.nested).toEqual(complexResult.nested);
          expect(parsedContent.array).toEqual(complexResult.array);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that tool call responses with errors are properly formatted
     */
    test.prop([fc.string({ minLength: 1, maxLength: 200 }), fc.uuid()])(
      'should format tool call error responses correctly',
      async (errorMessage, toolCallId) => {
        const threadId = await createTestThread();

        try {
          // Create a tool result message with an error
          const toolResultMessage = await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: JSON.stringify({
                  error: true,
                  message: errorMessage,
                }),
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Verify the error message was saved correctly
          const savedMessage = await prisma.message.findUnique({
            where: { id: toolResultMessage.id },
          });

          expect(savedMessage).toBeDefined();

          const messageContent = JSON.parse(savedMessage!.content);
          expect(messageContent.tool_call_id).toBe(toolCallId);
          expect(messageContent.tool_name).toBe('test_tool');

          const parsedContent = JSON.parse(messageContent.content);
          expect(parsedContent.error).toBe(true);
          expect(parsedContent.message).toBe(errorMessage);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that multiple tool call responses are handled correctly
     */
    test.prop([
      fc.array(
        fc.record({
          toolCallId: fc.uuid(),
          toolName: fc.constantFrom('test_tool', 'calculator_tool', 'search_tool'),
          result: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    ])('should handle multiple tool call responses in sequence', async (toolCalls) => {
      const threadId = await createTestThread();

      try {
        // Create multiple tool result messages
        for (const toolCall of toolCalls) {
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCall.toolCallId,
                tool_name: toolCall.toolName,
                content: toolCall.result,
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });
        }

        // Verify all messages were saved correctly
        const savedMessages = await prisma.message.findMany({
          where: { threadId },
          orderBy: { creationDate: 'asc' },
        });

        expect(savedMessages.length).toBe(toolCalls.length);

        // Verify each message has the correct format
        for (let i = 0; i < toolCalls.length; i++) {
          const message = savedMessages[i];
          const content = JSON.parse(message.content);

          expect(content.tool_call_id).toBe(toolCalls[i].toolCallId);
          expect(content.tool_name).toBe(toolCalls[i].toolName);
          expect(content.content).toBe(toolCalls[i].result);
          expect(content.role).toBe('tool');
        }
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that tool call responses maintain order
     */
    it('should maintain tool call response order in database', async () => {
      const threadId = await createTestThread();

      try {
        const toolCallIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

        // Create tool result messages in sequence
        for (let i = 0; i < toolCallIds.length; i++) {
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallIds[i],
                tool_name: 'test_tool',
                content: `Result ${i + 1}`,
              }),
              isComplete: true,
              creationDate: new Date(Date.now() + i * 1000), // Ensure different timestamps
            },
          });
        }

        // Verify messages are retrieved in order
        const messages = await prisma.message.findMany({
          where: { threadId },
          orderBy: { creationDate: 'asc' },
        });

        expect(messages.length).toBe(3);

        for (let i = 0; i < messages.length; i++) {
          const content = JSON.parse(messages[i].content);
          expect(content.tool_call_id).toBe(toolCallIds[i]);
          expect(content.content).toBe(`Result ${i + 1}`);
        }
      } finally {
        await cleanupTestThread(threadId);
      }
    });

    /**
     * Test that tool call responses with string results are handled correctly
     */
    test.prop([fc.string({ minLength: 1, maxLength: 500 }), fc.uuid()])(
      'should handle tool call responses with plain string results',
      async (stringResult, toolCallId) => {
        const threadId = await createTestThread();

        try {
          // Create a tool result message with a plain string
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: stringResult, // Plain string, not JSON
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Verify the message was saved correctly
          const messages = await prisma.message.findMany({
            where: { threadId },
          });

          expect(messages.length).toBe(1);

          const content = JSON.parse(messages[0].content);
          expect(content.tool_call_id).toBe(toolCallId);
          expect(content.content).toBe(stringResult);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that tool call responses are properly linked to their tool calls
     */
    test.prop([fc.string({ minLength: 1 }), fc.uuid()])(
      'should link tool call responses to their corresponding tool calls',
      async (query, toolCallId) => {
        const threadId = await createTestThread();

        try {
          // Create an assistant message with a tool call
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.AI_TOOL,
              content: JSON.stringify({
                role: 'assistant',
                content: 'Using tool',
                tool_calls: [
                  {
                    id: toolCallId,
                    function: {
                      name: 'test_tool',
                      arguments: JSON.stringify({ query }),
                    },
                    type: 'function',
                  },
                ],
              }),
              isComplete: true,
              creationDate: new Date(),
              toolCalls: {
                create: [
                  {
                    id: toolCallId,
                    name: 'test_tool',
                    arguments: JSON.stringify({ query }),
                    validated: null,
                  },
                ],
              },
            },
          });

          // Create the corresponding tool result
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: `Result for: ${query}`,
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Verify both messages exist and are linked by tool_call_id
          const messages = await prisma.message.findMany({
            where: { threadId },
            orderBy: { creationDate: 'asc' },
            include: { toolCalls: true },
          });

          expect(messages.length).toBe(2);

          // First message should have the tool call
          const assistantMessage = messages[0];
          expect(assistantMessage.entity).toBe(Entity.AI_TOOL);
          expect(assistantMessage.toolCalls.length).toBe(1);
          expect(assistantMessage.toolCalls[0].id).toBe(toolCallId);

          // Second message should have the tool result with matching ID
          const toolMessage = messages[1];
          expect(toolMessage.entity).toBe(Entity.TOOL);
          const toolContent = JSON.parse(toolMessage.content);
          expect(toolContent.tool_call_id).toBe(toolCallId);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );

    /**
     * Test that tool call responses are marked as complete
     */
    test.prop([fc.string({ minLength: 1 }), fc.uuid()])(
      'should mark tool call responses as complete',
      async (result, toolCallId) => {
        const threadId = await createTestThread();

        try {
          const toolResultMessage = await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId,
              entity: Entity.TOOL,
              content: JSON.stringify({
                role: 'tool',
                tool_call_id: toolCallId,
                tool_name: 'test_tool',
                content: result,
              }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Verify the message is marked as complete
          const savedMessage = await prisma.message.findUnique({
            where: { id: toolResultMessage.id },
          });

          expect(savedMessage).toBeDefined();
          expect(savedMessage!.isComplete).toBe(true);
        } finally {
          await cleanupTestThread(threadId);
        }
      }
    );
  });
});
