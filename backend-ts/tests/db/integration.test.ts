/**
 * Database Integration Tests
 *
 * Integration tests for database operations including:
 * - Message creation and retrieval
 * - Thread management
 * - Full-text search
 *
 * Requirements: 13.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { randomUUID } from 'crypto';

describe('Database Integration Tests', () => {
  // Test data cleanup
  const testThreadIds: string[] = [];
  const testMessageIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    if (testMessageIds.length > 0) {
      await prisma.message.deleteMany({
        where: { id: { in: testMessageIds } },
      });
      testMessageIds.length = 0;
    }

    if (testThreadIds.length > 0) {
      await prisma.thread.deleteMany({
        where: { id: { in: testThreadIds } },
      });
      testThreadIds.length = 0;
    }
  });

  describe('Message Creation and Retrieval', () => {
    it('should create a message with all required fields', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread first
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'USER',
          content: JSON.stringify({ role: 'user', content: 'Hello, world!' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      expect(message).toBeDefined();
      expect(message.id).toBe(messageId);
      expect(message.threadId).toBe(threadId);
      expect(message.entity).toBe('USER');
      expect(message.isComplete).toBe(true);
    });

    it('should retrieve messages by thread ID', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create multiple messages
      const messageIds = [randomUUID(), randomUUID(), randomUUID()];
      testMessageIds.push(...messageIds);

      for (let i = 0; i < messageIds.length; i++) {
        await prisma.message.create({
          data: {
            id: messageIds[i],
            threadId,
            entity: i % 2 === 0 ? 'USER' : 'AI_MESSAGE',
            content: JSON.stringify({ content: `Message ${i + 1}` }),
            isComplete: true,
            creationDate: new Date(Date.now() + i * 1000),
          },
        });
      }

      // Retrieve messages
      const messages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { creationDate: 'asc' },
      });

      expect(messages).toHaveLength(3);
      expect(messages[0].entity).toBe('USER');
      expect(messages[1].entity).toBe('AI_MESSAGE');
      expect(messages[2].entity).toBe('USER');
    });

    it('should create message with tool calls', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message with tool calls
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'AI_MESSAGE',
          content: JSON.stringify({ content: 'Using tools...' }),
          isComplete: true,
          creationDate: new Date(),
          toolCalls: {
            create: [
              {
                id: 'call_123',
                name: 'web_search',
                arguments: JSON.stringify({ query: 'test query' }),
                validated: true,
              },
              {
                id: 'call_456',
                name: 'literature_search',
                arguments: JSON.stringify({ query: 'neuroscience' }),
                validated: false,
              },
            ],
          },
        },
        include: {
          toolCalls: true,
        },
      });

      expect(message.toolCalls).toHaveLength(2);
      expect(message.toolCalls[0].name).toBe('web_search');
      expect(message.toolCalls[1].name).toBe('literature_search');
    });

    it('should create message with token consumption', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message with token consumption
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'AI_MESSAGE',
          content: JSON.stringify({ content: 'Response' }),
          isComplete: true,
          creationDate: new Date(),
          tokenConsumption: {
            create: [
              {
                id: randomUUID(),
                type: 'INPUT_NONCACHED',
                task: 'CHAT_COMPLETION',
                count: 100,
                model: 'gpt-4',
              },
              {
                id: randomUUID(),
                type: 'COMPLETION',
                task: 'CHAT_COMPLETION',
                count: 50,
                model: 'gpt-4',
              },
            ],
          },
        },
        include: {
          tokenConsumption: true,
        },
      });

      expect(message.tokenConsumption).toHaveLength(2);
      expect(message.tokenConsumption[0].count).toBe(100);
      expect(message.tokenConsumption[1].count).toBe(50);
    });

    it('should create message with complexity estimation', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message with complexity estimation
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'Complex query' }),
          isComplete: true,
          creationDate: new Date(),
          complexityEstimation: {
            create: {
              id: randomUUID(),
              complexity: 7,
              model: 'gpt-4',
              reasoning: 'MEDIUM',
            },
          },
        },
        include: {
          complexityEstimation: true,
        },
      });

      expect(message.complexityEstimation).toHaveLength(1);
      expect(message.complexityEstimation[0].complexity).toBe(7);
      expect(message.complexityEstimation[0].reasoning).toBe('MEDIUM');
    });

    it('should retrieve messages with all relations', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message with all relations
      await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'AI_MESSAGE',
          content: JSON.stringify({ content: 'Complete message' }),
          isComplete: true,
          creationDate: new Date(),
          toolCalls: {
            create: {
              id: 'call_789',
              name: 'test_tool',
              arguments: '{}',
              validated: true,
            },
          },
          toolSelection: {
            create: {
              id: randomUUID(),
              toolName: 'test_tool',
            },
          },
          tokenConsumption: {
            create: {
              id: randomUUID(),
              type: 'COMPLETION',
              task: 'CHAT_COMPLETION',
              count: 25,
              model: 'gpt-4',
            },
          },
        },
      });

      // Retrieve with all relations
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          toolCalls: true,
          toolSelection: true,
          tokenConsumption: true,
          complexityEstimation: true,
        },
      });

      expect(message).toBeDefined();
      expect(message?.toolCalls).toHaveLength(1);
      expect(message?.toolSelection).toHaveLength(1);
      expect(message?.tokenConsumption).toHaveLength(1);
    });

    it('should handle incomplete messages', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create incomplete message
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'AI_MESSAGE',
          content: JSON.stringify({ content: 'Partial response...' }),
          isComplete: false,
          creationDate: new Date(),
        },
      });

      expect(message.isComplete).toBe(false);

      // Update to complete
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: JSON.stringify({ content: 'Complete response' }),
          isComplete: true,
        },
      });

      expect(updated.isComplete).toBe(true);
    });
  });

  describe('Thread Management', () => {
    it('should create a thread with all fields', async () => {
      const threadId = randomUUID();
      const userId = randomUUID();
      testThreadIds.push(threadId);

      const thread = await prisma.thread.create({
        data: {
          id: threadId,
          userId,
          title: 'My Research Thread',
          vlabId: randomUUID(),
          projectId: randomUUID(),
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      expect(thread).toBeDefined();
      expect(thread.id).toBe(threadId);
      expect(thread.userId).toBe(userId);
      expect(thread.title).toBe('My Research Thread');
      expect(thread.vlabId).toBeDefined();
      expect(thread.projectId).toBeDefined();
    });

    it('should retrieve threads by user ID', async () => {
      const userId = randomUUID();
      const threadIds = [randomUUID(), randomUUID(), randomUUID()];
      testThreadIds.push(...threadIds);

      // Create multiple threads for the same user
      for (let i = 0; i < threadIds.length; i++) {
        await prisma.thread.create({
          data: {
            id: threadIds[i],
            userId,
            title: `Thread ${i + 1}`,
            creationDate: new Date(Date.now() + i * 1000),
            updateDate: new Date(Date.now() + i * 1000),
          },
        });
      }

      // Retrieve threads
      const threads = await prisma.thread.findMany({
        where: { userId },
        orderBy: { creationDate: 'desc' },
      });

      expect(threads).toHaveLength(3);
      expect(threads[0].title).toBe('Thread 3');
      expect(threads[1].title).toBe('Thread 2');
      expect(threads[2].title).toBe('Thread 1');
    });

    it('should update thread title and updateDate', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      const creationDate = new Date();
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Original Title',
          creationDate,
          updateDate: creationDate,
        },
      });

      // Wait a bit to ensure updateDate changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update thread
      const updated = await prisma.thread.update({
        where: { id: threadId },
        data: {
          title: 'Updated Title',
          updateDate: new Date(),
        },
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.updateDate.getTime()).toBeGreaterThan(creationDate.getTime());
    });

    it('should delete thread and cascade delete messages', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread with message
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Thread to Delete',
          creationDate: new Date(),
          updateDate: new Date(),
          messages: {
            create: {
              id: messageId,
              entity: 'USER',
              content: JSON.stringify({ content: 'Test' }),
              isComplete: true,
              creationDate: new Date(),
            },
          },
        },
      });

      // Verify message exists
      const messageBefore = await prisma.message.findUnique({
        where: { id: messageId },
      });
      expect(messageBefore).toBeDefined();

      // Delete thread
      await prisma.thread.delete({
        where: { id: threadId },
      });

      // Verify message was cascade deleted
      const messageAfter = await prisma.message.findUnique({
        where: { id: messageId },
      });
      expect(messageAfter).toBeNull();

      // Remove from cleanup arrays since already deleted
      const threadIndex = testThreadIds.indexOf(threadId);
      if (threadIndex > -1) testThreadIds.splice(threadIndex, 1);
      const messageIndex = testMessageIds.indexOf(messageId);
      if (messageIndex > -1) testMessageIds.splice(messageIndex, 1);
    });

    it('should retrieve thread with message count', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread with multiple messages
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Thread with Messages',
          creationDate: new Date(),
          updateDate: new Date(),
          messages: {
            create: [
              {
                id: randomUUID(),
                entity: 'USER',
                content: JSON.stringify({ content: 'Message 1' }),
                isComplete: true,
                creationDate: new Date(),
              },
              {
                id: randomUUID(),
                entity: 'AI_MESSAGE',
                content: JSON.stringify({ content: 'Message 2' }),
                isComplete: true,
                creationDate: new Date(),
              },
              {
                id: randomUUID(),
                entity: 'USER',
                content: JSON.stringify({ content: 'Message 3' }),
                isComplete: true,
                creationDate: new Date(),
              },
            ],
          },
        },
      });

      // Retrieve thread with message count
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      expect(thread).toBeDefined();
      expect(thread?._count.messages).toBe(3);
    });

    it('should filter threads by vlab and project', async () => {
      const userId = randomUUID();
      const vlabId = randomUUID();
      const projectId = randomUUID();
      const threadIds = [randomUUID(), randomUUID(), randomUUID()];
      testThreadIds.push(...threadIds);

      // Create threads with different vlab/project combinations
      await prisma.thread.create({
        data: {
          id: threadIds[0],
          userId,
          title: 'Thread 1',
          vlabId,
          projectId,
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      await prisma.thread.create({
        data: {
          id: threadIds[1],
          userId,
          title: 'Thread 2',
          vlabId,
          projectId: randomUUID(), // Different project
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      await prisma.thread.create({
        data: {
          id: threadIds[2],
          userId,
          title: 'Thread 3',
          vlabId: null,
          projectId: null,
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Filter by vlab and project
      const filtered = await prisma.thread.findMany({
        where: {
          userId,
          vlabId,
          projectId,
        },
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Thread 1');
    });
  });

  describe('Full-Text Search', () => {
    it('should search messages using raw SQL with tsvector', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Search Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create messages with searchable content
      const messageIds = [randomUUID(), randomUUID(), randomUUID()];
      testMessageIds.push(...messageIds);

      await prisma.message.create({
        data: {
          id: messageIds[0],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'What is the hippocampus?' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[1],
          threadId,
          entity: 'AI_MESSAGE',
          content: JSON.stringify({
            content: 'The hippocampus is a brain region involved in memory formation.',
          }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[2],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'Tell me about the cerebellum.' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      // Update search vectors (in production, this is done by database trigger)
      await prisma.$executeRaw`
        UPDATE messages
        SET search_vector = to_tsvector('english', content)
        WHERE thread_id = ${threadId}::uuid
      `;

      // Search for "hippocampus"
      const results = await prisma.$queryRaw<Array<{ message_id: string }>>`
        SELECT message_id
        FROM messages
        WHERE thread_id = ${threadId}::uuid
        AND search_vector @@ to_tsquery('english', 'hippocampus')
        ORDER BY creation_date ASC
      `;

      expect(results).toHaveLength(2);
      expect(results[0].message_id).toBe(messageIds[0]);
      expect(results[1].message_id).toBe(messageIds[1]);
    });

    it('should rank search results by relevance', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Ranking Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create messages with varying relevance
      const messageIds = [randomUUID(), randomUUID(), randomUUID()];
      testMessageIds.push(...messageIds);

      await prisma.message.create({
        data: {
          id: messageIds[0],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'neuron' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[1],
          threadId,
          entity: 'AI_MESSAGE',
          content: JSON.stringify({
            content: 'A neuron is a nerve cell. Neurons are the basic units of the nervous system.',
          }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[2],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'Tell me about synapses.' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      // Update search vectors
      await prisma.$executeRaw`
        UPDATE messages
        SET search_vector = to_tsvector('english', content)
        WHERE thread_id = ${threadId}::uuid
      `;

      // Search with ranking
      const results = await prisma.$queryRaw<
        Array<{ message_id: string; rank: number }>
      >`
        SELECT
          message_id,
          ts_rank(search_vector, to_tsquery('english', 'neuron')) as rank
        FROM messages
        WHERE thread_id = ${threadId}::uuid
        AND search_vector @@ to_tsquery('english', 'neuron')
        ORDER BY rank DESC
      `;

      expect(results.length).toBeGreaterThan(0);
      // Message with multiple occurrences should rank higher
      expect(results[0].message_id).toBe(messageIds[1]);
      expect(results[0].rank).toBeGreaterThan(0);
    });

    it('should search across multiple threads for a user', async () => {
      const userId = randomUUID();
      const threadIds = [randomUUID(), randomUUID()];
      testThreadIds.push(...threadIds);

      // Create two threads
      await prisma.thread.create({
        data: {
          id: threadIds[0],
          userId,
          title: 'Thread 1',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      await prisma.thread.create({
        data: {
          id: threadIds[1],
          userId,
          title: 'Thread 2',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create messages in both threads
      const messageIds = [randomUUID(), randomUUID(), randomUUID()];
      testMessageIds.push(...messageIds);

      await prisma.message.create({
        data: {
          id: messageIds[0],
          threadId: threadIds[0],
          entity: 'USER',
          content: JSON.stringify({ content: 'cortex research' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[1],
          threadId: threadIds[1],
          entity: 'USER',
          content: JSON.stringify({ content: 'cortex analysis' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[2],
          threadId: threadIds[1],
          entity: 'USER',
          content: JSON.stringify({ content: 'unrelated topic' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      // Update search vectors
      await prisma.$executeRaw`
        UPDATE messages
        SET search_vector = to_tsvector('english', content)
        WHERE thread_id = ANY(ARRAY[${threadIds[0]}::uuid, ${threadIds[1]}::uuid])
      `;

      // Search across threads
      const results = await prisma.$queryRaw<
        Array<{ message_id: string; thread_id: string }>
      >`
        SELECT m.message_id, m.thread_id
        FROM messages m
        INNER JOIN threads t ON m.thread_id = t.thread_id
        WHERE t.user_id = ${userId}::uuid
        AND m.search_vector @@ to_tsquery('english', 'cortex')
        ORDER BY m.creation_date ASC
      `;

      expect(results).toHaveLength(2);
      expect(results[0].message_id).toBe(messageIds[0]);
      expect(results[1].message_id).toBe(messageIds[1]);
    });

    it('should handle complex search queries with AND/OR operators', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Complex Search Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create messages
      const messageIds = [randomUUID(), randomUUID(), randomUUID()];
      testMessageIds.push(...messageIds);

      await prisma.message.create({
        data: {
          id: messageIds[0],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'brain and memory' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[1],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'brain and learning' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          id: messageIds[2],
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'memory formation' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      // Update search vectors
      await prisma.$executeRaw`
        UPDATE messages
        SET search_vector = to_tsvector('english', content)
        WHERE thread_id = ${threadId}::uuid
      `;

      // Search with AND operator
      const andResults = await prisma.$queryRaw<Array<{ message_id: string }>>`
        SELECT message_id
        FROM messages
        WHERE thread_id = ${threadId}::uuid
        AND search_vector @@ to_tsquery('english', 'brain & memory')
        ORDER BY creation_date ASC
      `;

      expect(andResults).toHaveLength(1);
      expect(andResults[0].message_id).toBe(messageIds[0]);

      // Search with OR operator
      const orResults = await prisma.$queryRaw<Array<{ message_id: string }>>`
        SELECT message_id
        FROM messages
        WHERE thread_id = ${threadId}::uuid
        AND search_vector @@ to_tsquery('english', 'memory | learning')
        ORDER BY creation_date ASC
      `;

      expect(orResults).toHaveLength(3);
    });

    it('should handle empty search results gracefully', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread with messages
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Empty Search Thread',
          creationDate: new Date(),
          updateDate: new Date(),
          messages: {
            create: {
              id: randomUUID(),
              entity: 'USER',
              content: JSON.stringify({ content: 'Hello world' }),
              isComplete: true,
              creationDate: new Date(),
            },
          },
        },
      });

      // Update search vectors
      await prisma.$executeRaw`
        UPDATE messages
        SET search_vector = to_tsvector('english', content)
        WHERE thread_id = ${threadId}::uuid
      `;

      // Search for non-existent term
      const results = await prisma.$queryRaw<Array<{ message_id: string }>>`
        SELECT message_id
        FROM messages
        WHERE thread_id = ${threadId}::uuid
        AND search_vector @@ to_tsquery('english', 'nonexistentterm')
      `;

      expect(results).toHaveLength(0);
    });
  });

  describe('Transaction and Cascade Operations', () => {
    it('should handle transaction rollback on error', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Transaction Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Attempt transaction that should fail
      try {
        await prisma.$transaction(async (tx) => {
          // Create a valid message
          await tx.message.create({
            data: {
              id: randomUUID(),
              threadId,
              entity: 'USER',
              content: JSON.stringify({ content: 'First message' }),
              isComplete: true,
              creationDate: new Date(),
            },
          });

          // Try to create an invalid message (missing required field)
          // This should cause the transaction to rollback
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

      // Verify no messages were created (transaction rolled back)
      const messages = await prisma.message.findMany({
        where: { threadId },
      });

      expect(messages).toHaveLength(0);
    });

    it('should cascade delete tool calls when message is deleted', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread with message and tool calls
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Cascade Test',
          creationDate: new Date(),
          updateDate: new Date(),
          messages: {
            create: {
              id: messageId,
              entity: 'AI_MESSAGE',
              content: JSON.stringify({ content: 'Test' }),
              isComplete: true,
              creationDate: new Date(),
              toolCalls: {
                create: [
                  {
                    id: 'call_1',
                    name: 'tool1',
                    arguments: '{}',
                    validated: true,
                  },
                  {
                    id: 'call_2',
                    name: 'tool2',
                    arguments: '{}',
                    validated: true,
                  },
                ],
              },
            },
          },
        },
      });

      // Verify tool calls exist
      const toolCallsBefore = await prisma.toolCall.findMany({
        where: { messageId },
      });
      expect(toolCallsBefore).toHaveLength(2);

      // Delete message
      await prisma.message.delete({
        where: { id: messageId },
      });

      // Verify tool calls were cascade deleted
      const toolCallsAfter = await prisma.toolCall.findMany({
        where: { messageId },
      });
      expect(toolCallsAfter).toHaveLength(0);

      // Remove from cleanup
      const messageIndex = testMessageIds.indexOf(messageId);
      if (messageIndex > -1) testMessageIds.splice(messageIndex, 1);
    });

    it('should cascade delete all related data when thread is deleted', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread with message and all relations
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Full Cascade Test',
          creationDate: new Date(),
          updateDate: new Date(),
          messages: {
            create: {
              id: messageId,
              entity: 'AI_MESSAGE',
              content: JSON.stringify({ content: 'Test' }),
              isComplete: true,
              creationDate: new Date(),
              toolCalls: {
                create: {
                  id: 'call_cascade',
                  name: 'test_tool',
                  arguments: '{}',
                  validated: true,
                },
              },
              toolSelection: {
                create: {
                  id: randomUUID(),
                  toolName: 'test_tool',
                },
              },
              tokenConsumption: {
                create: {
                  id: randomUUID(),
                  type: 'COMPLETION',
                  task: 'CHAT_COMPLETION',
                  count: 10,
                  model: 'gpt-4',
                },
              },
              complexityEstimation: {
                create: {
                  id: randomUUID(),
                  complexity: 5,
                  model: 'gpt-4',
                  reasoning: 'LOW',
                },
              },
            },
          },
        },
      });

      // Verify all relations exist
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          toolCalls: true,
          toolSelection: true,
          tokenConsumption: true,
          complexityEstimation: true,
        },
      });
      expect(message).toBeDefined();
      expect(message?.toolCalls).toHaveLength(1);
      expect(message?.toolSelection).toHaveLength(1);
      expect(message?.tokenConsumption).toHaveLength(1);
      expect(message?.complexityEstimation).toHaveLength(1);

      // Delete thread
      await prisma.thread.delete({
        where: { id: threadId },
      });

      // Verify all related data was cascade deleted
      const messageAfter = await prisma.message.findUnique({
        where: { id: messageId },
      });
      expect(messageAfter).toBeNull();

      const toolCallsAfter = await prisma.toolCall.findMany({
        where: { messageId },
      });
      expect(toolCallsAfter).toHaveLength(0);

      const toolSelectionAfter = await prisma.toolSelection.findMany({
        where: { messageId },
      });
      expect(toolSelectionAfter).toHaveLength(0);

      const tokenConsumptionAfter = await prisma.tokenConsumption.findMany({
        where: { messageId },
      });
      expect(tokenConsumptionAfter).toHaveLength(0);

      const complexityAfter = await prisma.complexityEstimation.findMany({
        where: { messageId },
      });
      expect(complexityAfter).toHaveLength(0);

      // Remove from cleanup
      const threadIndex = testThreadIds.indexOf(threadId);
      if (threadIndex > -1) testThreadIds.splice(threadIndex, 1);
      const messageIndex = testMessageIds.indexOf(messageId);
      if (messageIndex > -1) testMessageIds.splice(messageIndex, 1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent message creation in same thread', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Concurrent Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create multiple messages concurrently
      const messageIds = [randomUUID(), randomUUID(), randomUUID()];
      testMessageIds.push(...messageIds);

      await Promise.all(
        messageIds.map((id, index) =>
          prisma.message.create({
            data: {
              id,
              threadId,
              entity: index % 2 === 0 ? 'USER' : 'AI_MESSAGE',
              content: JSON.stringify({ content: `Message ${index + 1}` }),
              isComplete: true,
              creationDate: new Date(Date.now() + index * 100),
            },
          })
        )
      );

      // Verify all messages were created
      const messages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { creationDate: 'asc' },
      });

      expect(messages).toHaveLength(3);
    });

    it('should handle concurrent thread updates', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Original Title',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Update thread concurrently (last write wins)
      await Promise.all([
        prisma.thread.update({
          where: { id: threadId },
          data: { title: 'Update 1', updateDate: new Date() },
        }),
        prisma.thread.update({
          where: { id: threadId },
          data: { title: 'Update 2', updateDate: new Date() },
        }),
        prisma.thread.update({
          where: { id: threadId },
          data: { title: 'Update 3', updateDate: new Date() },
        }),
      ]);

      // Verify thread was updated (one of the updates succeeded)
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
      });

      expect(thread).toBeDefined();
      expect(thread?.title).toMatch(/Update [123]/);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle messages with large content', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Large Content Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message with large content
      const largeContent = 'A'.repeat(10000);
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: largeContent }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      expect(message).toBeDefined();
      const parsed = JSON.parse(message.content);
      expect(parsed.content).toHaveLength(10000);
    });

    it('should handle thread with no messages', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread without messages
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Empty Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Retrieve thread with messages
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: { messages: true },
      });

      expect(thread).toBeDefined();
      expect(thread?.messages).toHaveLength(0);
    });

    it('should handle message with null optional fields', async () => {
      const threadId = randomUUID();
      const messageId = randomUUID();
      testThreadIds.push(threadId);
      testMessageIds.push(messageId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Null Fields Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Create message with minimal fields
      const message = await prisma.message.create({
        data: {
          id: messageId,
          threadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'Test' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });

      expect(message).toBeDefined();
      // searchVector is undefined when not set (Prisma behavior for Unsupported types)
      expect(message.searchVector).toBeUndefined();
    });

    it('should handle thread with null vlab and project IDs', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread without vlab/project
      const thread = await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'No VLab Thread',
          vlabId: null,
          projectId: null,
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      expect(thread).toBeDefined();
      expect(thread.vlabId).toBeNull();
      expect(thread.projectId).toBeNull();
    });

    it('should reject message with invalid entity type', async () => {
      const threadId = randomUUID();
      testThreadIds.push(threadId);

      // Create thread
      await prisma.thread.create({
        data: {
          id: threadId,
          userId: randomUUID(),
          title: 'Invalid Entity Test',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Try to create message with invalid entity
      await expect(
        prisma.message.create({
          data: {
            id: randomUUID(),
            threadId,
            entity: 'INVALID_ENTITY' as any,
            content: JSON.stringify({ content: 'Test' }),
            isComplete: true,
            creationDate: new Date(),
          },
        })
      ).rejects.toThrow();
    });

    it('should reject message with non-existent thread ID', async () => {
      const nonExistentThreadId = randomUUID();

      // Try to create message for non-existent thread
      await expect(
        prisma.message.create({
          data: {
            id: randomUUID(),
            threadId: nonExistentThreadId,
            entity: 'USER',
            content: JSON.stringify({ content: 'Test' }),
            isComplete: true,
            creationDate: new Date(),
          },
        })
      ).rejects.toThrow();
    });
  });
});
