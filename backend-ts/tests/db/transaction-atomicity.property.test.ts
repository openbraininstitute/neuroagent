/**
 * Property-Based Tests for Transaction Atomicity
 *
 * Feature: typescript-backend-migration
 * Property 7: Transaction Atomicity
 *
 * For any database transaction involving message commits, if any operation fails,
 * the entire transaction should roll back leaving no partial state.
 *
 * Validates: Requirements 3.6
 *
 * This test verifies that:
 * 1. Successful transactions commit all operations atomically
 * 2. Failed transactions roll back completely with no partial state
 * 3. Database constraints are enforced within transactions
 * 4. Related entities (messages, tool calls, token consumption) are handled atomically
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/db/client';
import { randomUUID } from 'crypto';

/**
 * Test data cleanup helper
 */
const testThreadIds: string[] = [];
const testMessageIds: string[] = [];

/**
 * Arbitrary generators for test data
 */
const entityArbitrary = fc.constantFrom('USER', 'AI_MESSAGE', 'TOOL', 'AI_TOOL');

/**
 * Helper to create a test thread
 */
async function createTestThread(threadId: string): Promise<void> {
  await prisma.thread.create({
    data: {
      id: threadId,
      userId: randomUUID(),
      title: 'Transaction Test Thread',
      creationDate: new Date(),
      updateDate: new Date(),
    },
  });
  testThreadIds.push(threadId);
}

/**
 * Helper to count all related entities for a thread
 */
async function countThreadEntities(threadId: string): Promise<{
  messages: number;
  toolCalls: number;
  toolSelections: number;
  tokenConsumptions: number;
  complexityEstimations: number;
}> {
  const messages = await prisma.message.findMany({
    where: { threadId },
    include: {
      toolCalls: true,
      toolSelection: true,
      tokenConsumption: true,
      complexityEstimation: true,
    },
  });

  return {
    messages: messages.length,
    toolCalls: messages.reduce((sum, m) => sum + m.toolCalls.length, 0),
    toolSelections: messages.reduce((sum, m) => sum + m.toolSelection.length, 0),
    tokenConsumptions: messages.reduce((sum, m) => sum + m.tokenConsumption.length, 0),
    complexityEstimations: messages.reduce((sum, m) => sum + m.complexityEstimation.length, 0),
  };
}

describe('Transaction Atomicity Property Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testMessageIds.length > 0) {
      await prisma.message.deleteMany({
        where: { id: { in: testMessageIds } },
      });
    }
    if (testThreadIds.length > 0) {
      await prisma.thread.deleteMany({
        where: { id: { in: testThreadIds } },
      });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Clear tracking arrays before each test
    testThreadIds.length = 0;
    testMessageIds.length = 0;
  });

  describe('Property 7: Transaction Atomicity', () => {
    /**
     * **Validates: Requirements 3.6**
     *
     * Test that successful transactions commit all operations atomically
     */
    it('should commit all operations atomically on success', async () => {
      const threadId = randomUUID();
      await createTestThread(threadId);

      const messageId = randomUUID();
      const toolCallId = randomUUID();

      // Execute a successful transaction with multiple operations
      await prisma.$transaction(async (tx) => {
        // Create message
        await tx.message.create({
          data: {
            id: messageId,
            threadId,
            entity: 'USER',
            content: JSON.stringify({ content: 'Test message' }),
            isComplete: true,
            creationDate: new Date(),
          },
        });

        // Create tool call
        await tx.toolCall.create({
          data: {
            id: toolCallId,
            messageId,
            name: 'test_tool',
            arguments: JSON.stringify({ arg: 'value' }),
            validated: true,
          },
        });

        // Create token consumption
        await tx.tokenConsumption.create({
          data: {
            id: randomUUID(),
            messageId,
            type: 'INPUT_NONCACHED',
            task: 'CHAT_COMPLETION',
            count: 100,
            model: 'gpt-4',
          },
        });
      });

      testMessageIds.push(messageId);

      // Verify all entities were created
      const counts = await countThreadEntities(threadId);
      expect(counts.messages).toBe(1);
      expect(counts.toolCalls).toBe(1);
      expect(counts.tokenConsumptions).toBe(1);
    });

    /**
     * **Validates: Requirements 3.6**
     *
     * Test that failed transactions roll back completely with no partial state
     */
    it('should roll back all operations on failure', async () => {
      const threadId = randomUUID();
      await createTestThread(threadId);

      const messageId = randomUUID();

      // Capture initial state
      const initialCounts = await countThreadEntities(threadId);

      // Attempt a transaction that will fail
      try {
        await prisma.$transaction(async (tx) => {
          // Create a valid message
          await tx.message.create({
            data: {
              id: messageId,
              threadId,
              entity: 'USER',
              content: JSON.stringify({ content: 'First message' }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Create a valid tool call
          await tx.toolCall.create({
            data: {
              id: randomUUID(),
              messageId,
              name: 'test_tool',
              arguments: JSON.stringify({ arg: 'value' }),
              validated: true,
            },
          });

          // Create an invalid message (missing required field) to force rollback
          await tx.message.create({
            data: {
              id: randomUUID(),
              threadId,
              entity: 'USER',
              // Missing content field - should fail
              isComplete: true,
              creationDate: new Date(),
            } as any,
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify no partial state - all operations should be rolled back
      const finalCounts = await countThreadEntities(threadId);
      expect(finalCounts).toEqual(initialCounts);
      expect(finalCounts.messages).toBe(0);
      expect(finalCounts.toolCalls).toBe(0);
    });

    /**
     * **Validates: Requirements 3.6**
     *
     * Property test: For any valid message data, if the transaction fails,
     * no partial state should remain
     */
    test.prop([
      fc.record({
        entity: entityArbitrary,
        content: fc.string({ minLength: 1, maxLength: 1000 }),
        isComplete: fc.boolean(),
      }),
    ])('should never leave partial state for any message data', async (messageData) => {
      const threadId = randomUUID();
      await createTestThread(threadId);

      const messageId = randomUUID();

      // Capture initial state
      const initialCounts = await countThreadEntities(threadId);

      // Attempt transaction that will fail due to constraint violation
      try {
        await prisma.$transaction(async (tx) => {
          // Create message with provided data
          await tx.message.create({
            data: {
              id: messageId,
              threadId,
              entity: messageData.entity as any,
              content: messageData.content,
              isComplete: messageData.isComplete,
              creationDate: new Date(),
            },
          });

          // Create tool call
          await tx.toolCall.create({
            data: {
              id: randomUUID(),
              messageId,
              name: 'test_tool',
              arguments: JSON.stringify({ test: 'data' }),
            },
          });

          // Force failure by violating foreign key constraint
          await tx.message.create({
            data: {
              id: randomUUID(),
              threadId: randomUUID(), // Non-existent thread - should fail
              entity: 'USER',
              content: 'Invalid message',
              isComplete: true,
              creationDate: new Date(),
            },
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Property: No partial state should remain after rollback
      const finalCounts = await countThreadEntities(threadId);
      expect(finalCounts).toEqual(initialCounts);
    });

    /**
     * **Validates: Requirements 3.6**
     *
     * Property test: For any combination of related entities, transaction
     * failures should roll back all entities atomically
     */
    test.prop([
      fc.record({
        messageCount: fc.integer({ min: 1, max: 3 }),
        toolCallsPerMessage: fc.integer({ min: 0, max: 3 }),
        tokenConsumptionsPerMessage: fc.integer({ min: 0, max: 3 }),
      }),
    ])(
      'should roll back all related entities atomically',
      async ({ messageCount, toolCallsPerMessage, tokenConsumptionsPerMessage }) => {
        const threadId = randomUUID();
        await createTestThread(threadId);

        const initialCounts = await countThreadEntities(threadId);

        // Attempt transaction with multiple related entities
        try {
          await prisma.$transaction(async (tx) => {
            for (let i = 0; i < messageCount; i++) {
              const messageId = randomUUID();

              // Create message
              await tx.message.create({
                data: {
                  id: messageId,
                  threadId,
                  entity: 'USER',
                  content: JSON.stringify({ content: `Message ${i}` }),
                  isComplete: true,
                  creationDate: new Date(),
                },
              });

              // Create tool calls
              for (let j = 0; j < toolCallsPerMessage; j++) {
                await tx.toolCall.create({
                  data: {
                    id: randomUUID(),
                    messageId,
                    name: `tool_${j}`,
                    arguments: JSON.stringify({ index: j }),
                  },
                });
              }

              // Create token consumptions
              for (let k = 0; k < tokenConsumptionsPerMessage; k++) {
                await tx.tokenConsumption.create({
                  data: {
                    id: randomUUID(),
                    messageId,
                    type: 'INPUT_NONCACHED',
                    task: 'CHAT_COMPLETION',
                    count: 100 * (k + 1),
                    model: 'gpt-4',
                  },
                });
              }
            }

            // Force failure at the end
            throw new Error('Intentional transaction failure');
          });
        } catch (error) {
          // Expected to fail
        }

        // Property: All operations should be rolled back
        const finalCounts = await countThreadEntities(threadId);
        expect(finalCounts).toEqual(initialCounts);
        expect(finalCounts.messages).toBe(0);
        expect(finalCounts.toolCalls).toBe(0);
        expect(finalCounts.tokenConsumptions).toBe(0);
      }
    );

    /**
     * **Validates: Requirements 3.6**
     *
     * Test that constraint violations trigger proper rollback
     */
    it('should roll back on foreign key constraint violation', async () => {
      const threadId = randomUUID();
      await createTestThread(threadId);

      const initialCounts = await countThreadEntities(threadId);

      try {
        await prisma.$transaction(async (tx) => {
          const messageId = randomUUID();

          // Create valid message
          await tx.message.create({
            data: {
              id: messageId,
              threadId,
              entity: 'USER',
              content: JSON.stringify({ content: 'Valid message' }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Try to create tool call with non-existent message ID
          await tx.toolCall.create({
            data: {
              id: randomUUID(),
              messageId: randomUUID(), // Non-existent message
              name: 'test_tool',
              arguments: JSON.stringify({ test: 'data' }),
            },
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify rollback
      const finalCounts = await countThreadEntities(threadId);
      expect(finalCounts).toEqual(initialCounts);
    });

    /**
     * **Validates: Requirements 3.6**
     *
     * Test that unique constraint violations trigger proper rollback
     */
    it('should roll back on unique constraint violation', async () => {
      const threadId = randomUUID();
      await createTestThread(threadId);

      const messageId = randomUUID();

      // Create initial message
      await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'Initial message' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });
      testMessageIds.push(messageId);

      const initialCounts = await countThreadEntities(threadId);

      try {
        await prisma.$transaction(async (tx) => {
          // Create another message
          await tx.message.create({
            data: {
              id: randomUUID(),
              threadId,
              entity: 'USER',
              content: JSON.stringify({ content: 'Second message' }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Try to create message with duplicate ID
          await tx.message.create({
            data: {
              id: messageId, // Duplicate ID - should fail
              threadId,
              entity: 'USER',
              content: JSON.stringify({ content: 'Duplicate message' }),
              isComplete: true,
              creationDate: new Date(),
            },
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify rollback - count should remain the same
      const finalCounts = await countThreadEntities(threadId);
      expect(finalCounts).toEqual(initialCounts);
      expect(finalCounts.messages).toBe(1); // Only the initial message
    });

    /**
     * **Validates: Requirements 3.6**
     *
     * Test that nested transactions maintain atomicity
     */
    it('should maintain atomicity with complex nested operations', async () => {
      const threadId = randomUUID();
      await createTestThread(threadId);

      const initialCounts = await countThreadEntities(threadId);

      try {
        await prisma.$transaction(async (tx) => {
          const messageId1 = randomUUID();
          const messageId2 = randomUUID();

          // Create first message with related entities
          await tx.message.create({
            data: {
              id: messageId1,
              threadId,
              entity: 'USER',
              content: JSON.stringify({ content: 'Message 1' }),
              isComplete: true,
              creationDate: new Date(),
              toolCalls: {
                create: [
                  {
                    id: randomUUID(),
                    name: 'tool1',
                    arguments: JSON.stringify({ arg: 'value1' }),
                  },
                ],
              },
              tokenConsumption: {
                create: [
                  {
                    id: randomUUID(),
                    type: 'INPUT_NONCACHED',
                    task: 'CHAT_COMPLETION',
                    count: 100,
                    model: 'gpt-4',
                  },
                ],
              },
            },
          });

          // Create second message with related entities
          await tx.message.create({
            data: {
              id: messageId2,
              threadId,
              entity: 'AI_MESSAGE',
              content: JSON.stringify({ content: 'Message 2' }),
              isComplete: true,
              creationDate: new Date(),
              toolCalls: {
                create: [
                  {
                    id: randomUUID(),
                    name: 'tool2',
                    arguments: JSON.stringify({ arg: 'value2' }),
                  },
                ],
              },
              tokenConsumption: {
                create: [
                  {
                    id: randomUUID(),
                    type: 'COMPLETION',
                    task: 'CHAT_COMPLETION',
                    count: 200,
                    model: 'gpt-4',
                  },
                ],
              },
            },
          });

          // Force failure
          throw new Error('Intentional failure after complex operations');
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify complete rollback
      const finalCounts = await countThreadEntities(threadId);
      expect(finalCounts).toEqual(initialCounts);
      expect(finalCounts.messages).toBe(0);
      expect(finalCounts.toolCalls).toBe(0);
      expect(finalCounts.tokenConsumptions).toBe(0);
    });

    /**
     * **Validates: Requirements 3.6**
     *
     * Property test: Transaction isolation - concurrent transactions should not
     * interfere with each other's rollback behavior
     */
    test.prop([fc.integer({ min: 2, max: 5 })])(
      'should maintain isolation between concurrent transactions',
      async (concurrentCount) => {
        const threadIds = Array(concurrentCount)
          .fill(0)
          .map(() => randomUUID());

        // Create all test threads
        for (const threadId of threadIds) {
          await createTestThread(threadId);
        }

        // Execute concurrent transactions (some will fail, some will succeed)
        const results = await Promise.allSettled(
          threadIds.map((threadId, index) =>
            prisma.$transaction(async (tx) => {
              const messageId = randomUUID();

              await tx.message.create({
                data: {
                  id: messageId,
                  threadId,
                  entity: 'USER',
                  content: JSON.stringify({ content: `Message ${index}` }),
                  isComplete: true,
                  creationDate: new Date(),
                },
              });

              // Fail odd-indexed transactions
              if (index % 2 === 1) {
                throw new Error('Intentional failure');
              }

              return messageId;
            })
          )
        );

        // Verify that failed transactions rolled back and successful ones committed
        for (let i = 0; i < threadIds.length; i++) {
          const threadId = threadIds[i];
          if (!threadId) continue;

          const counts = await countThreadEntities(threadId);

          if (i % 2 === 0) {
            // Even index - should have succeeded
            expect(counts.messages).toBe(1);
            if (results[i]?.status === 'fulfilled') {
              const messageId = (results[i] as PromiseFulfilledResult<string>).value;
              if (messageId) {
                testMessageIds.push(messageId);
              }
            }
          } else {
            // Odd index - should have rolled back
            expect(counts.messages).toBe(0);
          }
        }
      }
    );
  });
});
