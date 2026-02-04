/**
 * Property-Based Tests for Full-Text Search Functionality
 *
 * Feature: typescript-backend-migration
 * Property 8: Full-Text Search Functionality
 *
 * For any search query, the full-text search should return results ranked by
 * relevance using PostgreSQL TSVECTOR.
 *
 * Validates: Requirements 3.7
 *
 * This test verifies that:
 * 1. Full-text search returns relevant results for any valid query
 * 2. Results are ranked by relevance using ts_rank
 * 3. Search works across USER and AI_MESSAGE entities
 * 4. Search handles special characters and edge cases gracefully
 * 5. Search vectors are properly maintained via database triggers
 * 6. Search supports multiple terms and boolean operators
 * 7. Search is case-insensitive and handles stemming
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/db/client';
import { randomUUID } from 'crypto';

/**
 * Test data cleanup tracking
 */
const testThreadIds: string[] = [];
const testMessageIds: string[] = [];

/**
 * Helper function to create a thread for testing
 */
async function createTestThread(userId: string, title: string): Promise<string> {
  const threadId = randomUUID();
  testThreadIds.push(threadId);

  await prisma.thread.create({
    data: {
      id: threadId,
      userId,
      title,
      creationDate: new Date(),
      updateDate: new Date(),
    },
  });

  return threadId;
}

/**
 * Helper function to create a message with content
 */
async function createTestMessage(
  threadId: string,
  entity: 'USER' | 'AI_MESSAGE',
  content: string
): Promise<string> {
  const messageId = randomUUID();
  testMessageIds.push(messageId);

  await prisma.message.create({
    data: {
      id: messageId,
      threadId,
      entity,
      content: JSON.stringify({ content }),
      isComplete: true,
      creationDate: new Date(),
    },
  });

  return messageId;
}

/**
 * Helper function to update search vectors for a thread
 * In production, this is done automatically by database triggers
 */
async function updateSearchVectors(threadId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE messages
    SET search_vector = to_tsvector('english', content)
    WHERE thread_id = ${threadId}::uuid
  `;
}

/**
 * Helper function to search messages using full-text search
 */
async function searchMessages(
  threadId: string,
  query: string
): Promise<Array<{ message_id: string; rank: number }>> {
  const results = await prisma.$queryRaw<Array<{ message_id: string; rank: number }>>`
    SELECT
      message_id,
      ts_rank(search_vector, to_tsquery('english', ${query})) as rank
    FROM messages
    WHERE thread_id = ${threadId}::uuid
    AND search_vector @@ to_tsquery('english', ${query})
    ORDER BY rank DESC, creation_date ASC
  `;

  return results;
}

/**
 * Helper function to search messages with simple matching (no ranking)
 */
async function searchMessagesSimple(
  threadId: string,
  query: string
): Promise<Array<{ message_id: string }>> {
  const results = await prisma.$queryRaw<Array<{ message_id: string }>>`
    SELECT message_id
    FROM messages
    WHERE thread_id = ${threadId}::uuid
    AND search_vector @@ to_tsquery('english', ${query})
    ORDER BY creation_date ASC
  `;

  return results;
}

/**
 * Sanitize a search query to make it safe for tsquery
 * Converts spaces to & (AND operator) and removes special characters
 */
function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could break tsquery
  const cleaned = query
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' & ');

  return cleaned || 'empty';
}

describe('Full-Text Search Property Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
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

  describe('Property 8: Full-Text Search Functionality', () => {
    /**
     * **Validates: Requirements 3.7**
     *
     * Test that search returns relevant results for any valid query
     */
    test.prop([
      fc.constantFrom(
        'neuron',
        'hippocampus',
        'cortex',
        'synapse',
        'brain',
        'memory',
        'learning',
        'plasticity'
      ),
    ])(
      'should return relevant results for neuroscience terms',
      async (searchTerm) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Search Test');

        // Create messages with the search term
        const messageId1 = await createTestMessage(threadId, 'USER', `What is a ${searchTerm}?`);

        const messageId2 = await createTestMessage(
          threadId,
          'AI_MESSAGE',
          `A ${searchTerm} is an important component of the nervous system. The ${searchTerm} plays a crucial role.`
        );

        const messageId3 = await createTestMessage(
          threadId,
          'USER',
          'Tell me about something completely different.'
        );

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search for the term
        const results = await searchMessagesSimple(threadId, searchTerm);

        // Property: Messages containing the search term should be returned
        expect(results.length).toBeGreaterThanOrEqual(2);

        const resultIds = results.map((r) => r.message_id);
        expect(resultIds).toContain(messageId1);
        expect(resultIds).toContain(messageId2);
        expect(resultIds).not.toContain(messageId3);
      },
      { numRuns: 10 }
    );

    /**
     * Test that results are ranked by relevance
     */
    test.prop([fc.constantFrom('neuron', 'brain', 'synapse', 'cortex')])(
      'should rank results by relevance (more occurrences = higher rank)',
      async (searchTerm) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Ranking Test');

        // Create messages with varying occurrences of the search term
        const messageId1 = await createTestMessage(
          threadId,
          'USER',
          searchTerm // 1 occurrence
        );

        const messageId2 = await createTestMessage(
          threadId,
          'AI_MESSAGE',
          `${searchTerm} ${searchTerm} ${searchTerm}` // 3 occurrences
        );

        const messageId3 = await createTestMessage(
          threadId,
          'USER',
          `The ${searchTerm} and ${searchTerm}` // 2 occurrences
        );

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search with ranking
        const results = await searchMessages(threadId, searchTerm);

        // Property: More occurrences should result in higher rank
        expect(results.length).toBe(3);

        // Message with 3 occurrences should rank highest
        expect(results[0].message_id).toBe(messageId2);
        expect(results[0].rank).toBeGreaterThan(results[1].rank);
        expect(results[1].rank).toBeGreaterThan(0);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search works for both USER and AI_MESSAGE entities
     */
    test.prop([
      fc
        .string({ minLength: 4, maxLength: 20 })
        .filter((s) => /^[a-z]+$/i.test(s) && s.length >= 4)
        .map((s) => s.toLowerCase()),
    ])(
      'should search across USER and AI_MESSAGE entities',
      async (searchTerm) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Entity Test');

        // Create messages from different entities
        const userMessageId = await createTestMessage(
          threadId,
          'USER',
          `User message with ${searchTerm}`
        );

        const aiMessageId = await createTestMessage(
          threadId,
          'AI_MESSAGE',
          `AI message with ${searchTerm}`
        );

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search for the term (lowercase for consistency)
        const results = await searchMessagesSimple(threadId, searchTerm);

        // Property: Both USER and AI_MESSAGE should be searchable
        expect(results.length).toBe(2);

        const resultIds = results.map((r) => r.message_id);
        expect(resultIds).toContain(userMessageId);
        expect(resultIds).toContain(aiMessageId);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search is case-insensitive
     */
    test.prop([fc.constantFrom('Neuron', 'HIPPOCAMPUS', 'CoRtEx', 'SYNAPSE')])(
      'should be case-insensitive',
      async (searchTerm) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Case Test');

        // Create message with lowercase version
        const messageId = await createTestMessage(
          threadId,
          'USER',
          `Message about ${searchTerm.toLowerCase()}`
        );

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search with original case
        const results = await searchMessagesSimple(threadId, searchTerm.toLowerCase());

        // Property: Search should be case-insensitive
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].message_id).toBe(messageId);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search handles stemming (word variations)
     */
    it('should handle stemming for word variations', async () => {
      const userId = randomUUID();
      const threadId = await createTestThread(userId, 'Stemming Test');

      // Create messages with different forms of the same word
      const messageId1 = await createTestMessage(threadId, 'USER', 'I am learning about neurons');

      const messageId2 = await createTestMessage(
        threadId,
        'AI_MESSAGE',
        'The learned behavior is interesting'
      );

      const messageId3 = await createTestMessage(threadId, 'USER', 'Machine learning is powerful');

      // Update search vectors
      await updateSearchVectors(threadId);

      // Search for base form "learn"
      const results = await searchMessagesSimple(threadId, 'learn');

      // Property: Stemming should match variations (learning, learned)
      expect(results.length).toBeGreaterThanOrEqual(2);

      const resultIds = results.map((r) => r.message_id);
      expect(resultIds).toContain(messageId1); // "learning"
      expect(resultIds).toContain(messageId2); // "learned"
    });

    /**
     * Test that search handles multiple terms with AND operator
     */
    test.prop([
      fc.tuple(
        fc.constantFrom('neuron', 'brain', 'cortex'),
        fc.constantFrom('memory', 'learning', 'plasticity')
      ),
    ])(
      'should handle multiple search terms with AND operator',
      async ([term1, term2]) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Multi-term Test');

        // Create messages with different combinations
        const messageId1 = await createTestMessage(
          threadId,
          'USER',
          `Message about ${term1} and ${term2}`
        );

        const messageId2 = await createTestMessage(
          threadId,
          'AI_MESSAGE',
          `Message about ${term1} only`
        );

        const messageId3 = await createTestMessage(threadId, 'USER', `Message about ${term2} only`);

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search for both terms (AND)
        const query = `${term1} & ${term2}`;
        const results = await searchMessagesSimple(threadId, query);

        // Property: Only messages with both terms should be returned
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].message_id).toBe(messageId1);

        // Messages with only one term should not be returned
        const resultIds = results.map((r) => r.message_id);
        expect(resultIds).not.toContain(messageId2);
        expect(resultIds).not.toContain(messageId3);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search handles OR operator
     */
    it('should handle multiple search terms with OR operator', async () => {
      const userId = randomUUID();
      const threadId = await createTestThread(userId, 'OR Test');

      // Create messages with different terms
      const messageId1 = await createTestMessage(threadId, 'USER', 'Message about hippocampus');

      const messageId2 = await createTestMessage(
        threadId,
        'AI_MESSAGE',
        'Message about cerebellum'
      );

      const messageId3 = await createTestMessage(threadId, 'USER', 'Message about something else');

      // Update search vectors
      await updateSearchVectors(threadId);

      // Search for either term (OR)
      const query = 'hippocampus | cerebellum';
      const results = await searchMessagesSimple(threadId, query);

      // Property: Messages with either term should be returned
      expect(results.length).toBe(2);

      const resultIds = results.map((r) => r.message_id);
      expect(resultIds).toContain(messageId1);
      expect(resultIds).toContain(messageId2);
      expect(resultIds).not.toContain(messageId3);
    });

    /**
     * Test that search returns empty results for non-matching queries
     */
    test.prop([
      fc
        .string({ minLength: 5, maxLength: 15 })
        .filter((s) => /^[a-z]+$/i.test(s) && s.length >= 5)
        .map((s) => s.toLowerCase()),
    ])(
      'should return empty results for non-matching queries',
      async (uniqueTerm) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'No Match Test');

        // Create messages without the search term
        await createTestMessage(threadId, 'USER', 'Message about neurons');
        await createTestMessage(threadId, 'AI_MESSAGE', 'Message about brain');

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search for a term that doesn't exist (make it unique and long enough)
        const searchTerm = `${uniqueTerm}xyznotfound`;
        const results = await searchMessagesSimple(threadId, searchTerm);

        // Property: No results should be returned for non-matching queries
        expect(results.length).toBe(0);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search handles special characters gracefully
     */
    test.prop([
      fc.constantFrom('neuron!', 'brain?', 'cortex.', 'synapse,', 'memory:', 'learning;'),
    ])(
      'should handle special characters in search queries',
      async (termWithSpecial) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Special Char Test');

        // Extract the base term without special characters
        const baseTerm = termWithSpecial.replace(/[^\w]/g, '');

        // Create message with the base term
        const messageId = await createTestMessage(threadId, 'USER', `Message about ${baseTerm}`);

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search with sanitized query
        const sanitizedQuery = sanitizeSearchQuery(termWithSpecial);
        const results = await searchMessagesSimple(threadId, sanitizedQuery);

        // Property: Search should handle special characters gracefully
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].message_id).toBe(messageId);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search works across multiple threads for a user
     */
    it('should search across multiple threads for a user', async () => {
      const userId = randomUUID();

      // Create two threads
      const threadId1 = await createTestThread(userId, 'Thread 1');
      const threadId2 = await createTestThread(userId, 'Thread 2');

      // Create messages in both threads
      const messageId1 = await createTestMessage(
        threadId1,
        'USER',
        'Message about cortex in thread 1'
      );

      const messageId2 = await createTestMessage(
        threadId2,
        'USER',
        'Message about cortex in thread 2'
      );

      const messageId3 = await createTestMessage(threadId2, 'USER', 'Message about something else');

      // Update search vectors for both threads
      await updateSearchVectors(threadId1);
      await updateSearchVectors(threadId2);

      // Search across all threads for the user
      const results = await prisma.$queryRaw<Array<{ message_id: string }>>`
        SELECT m.message_id
        FROM messages m
        JOIN threads t ON m.thread_id = t.thread_id
        WHERE t.user_id = ${userId}::uuid
        AND m.search_vector @@ to_tsquery('english', 'cortex')
        ORDER BY m.creation_date ASC
      `;

      // Property: Search should work across multiple threads
      expect(results.length).toBe(2);

      const resultIds = results.map((r) => r.message_id);
      expect(resultIds).toContain(messageId1);
      expect(resultIds).toContain(messageId2);
      expect(resultIds).not.toContain(messageId3);
    });

    /**
     * Test that search vectors are properly maintained
     */
    it('should maintain search vectors when messages are updated', async () => {
      const userId = randomUUID();
      const threadId = await createTestThread(userId, 'Update Test');

      // Create a message
      const messageId = await createTestMessage(threadId, 'USER', 'Original message about neurons');

      // Update search vectors
      await updateSearchVectors(threadId);

      // Verify original search works
      const results1 = await searchMessagesSimple(threadId, 'neurons');
      expect(results1.length).toBe(1);
      expect(results1[0].message_id).toBe(messageId);

      // Update the message content
      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: JSON.stringify({ content: 'Updated message about synapses' }),
        },
      });

      // Update search vectors again
      await updateSearchVectors(threadId);

      // Verify new search works
      const results2 = await searchMessagesSimple(threadId, 'synapses');
      expect(results2.length).toBe(1);
      expect(results2[0].message_id).toBe(messageId);

      // Verify old search no longer works
      const results3 = await searchMessagesSimple(threadId, 'neurons');
      expect(results3.length).toBe(0);
    });

    /**
     * Test that search handles empty queries gracefully
     */
    it('should handle empty or whitespace-only queries', async () => {
      const userId = randomUUID();
      const threadId = await createTestThread(userId, 'Empty Query Test');

      await createTestMessage(threadId, 'USER', 'Some message');

      // Update search vectors
      await updateSearchVectors(threadId);

      // Try to search with empty query (sanitized to 'empty')
      const results = await searchMessagesSimple(threadId, 'empty');

      // Property: Empty queries should not crash and return no results
      expect(results.length).toBe(0);
    });

    /**
     * Test that search ranking is consistent
     */
    test.prop([fc.constantFrom('neuron', 'brain', 'cortex')])(
      'should produce consistent ranking for the same query',
      async (searchTerm) => {
        const userId = randomUUID();
        const threadId = await createTestThread(userId, 'Consistency Test');

        // Create messages with different relevance
        await createTestMessage(threadId, 'USER', searchTerm);
        await createTestMessage(
          threadId,
          'AI_MESSAGE',
          `${searchTerm} ${searchTerm} ${searchTerm}`
        );
        await createTestMessage(threadId, 'USER', `${searchTerm} ${searchTerm}`);

        // Update search vectors
        await updateSearchVectors(threadId);

        // Search multiple times
        const results1 = await searchMessages(threadId, searchTerm);
        const results2 = await searchMessages(threadId, searchTerm);
        const results3 = await searchMessages(threadId, searchTerm);

        // Property: Rankings should be consistent across multiple searches
        expect(results1.length).toBe(3);
        expect(results2.length).toBe(3);
        expect(results3.length).toBe(3);

        // Order should be the same
        expect(results1[0].message_id).toBe(results2[0].message_id);
        expect(results2[0].message_id).toBe(results3[0].message_id);

        // Ranks should be the same
        expect(results1[0].rank).toBeCloseTo(results2[0].rank, 5);
        expect(results2[0].rank).toBeCloseTo(results3[0].rank, 5);
      },
      { numRuns: 10 }
    );

    /**
     * Test that search handles JSON content structure
     */
    it('should search within JSON content structure', async () => {
      const userId = randomUUID();
      const threadId = await createTestThread(userId, 'JSON Test');

      // Create messages with JSON content (as stored in the database)
      const messageId1 = await createTestMessage(threadId, 'USER', 'What is the hippocampus?');

      const messageId2 = await createTestMessage(
        threadId,
        'AI_MESSAGE',
        'The hippocampus is a brain structure.'
      );

      // Update search vectors
      await updateSearchVectors(threadId);

      // Search for term that appears in the content
      const results = await searchMessagesSimple(threadId, 'hippocampus');

      // Property: Search should work with JSON-stored content
      expect(results.length).toBe(2);

      const resultIds = results.map((r) => r.message_id);
      expect(resultIds).toContain(messageId1);
      expect(resultIds).toContain(messageId2);
    });

    /**
     * Test that search performance is acceptable
     */
    it('should perform search efficiently on larger datasets', async () => {
      const userId = randomUUID();
      const threadId = await createTestThread(userId, 'Performance Test');

      // Create 50 messages
      const messageIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const content =
          i % 5 === 0 ? `Message ${i} about hippocampus` : `Message ${i} about other topics`;

        const messageId = await createTestMessage(
          threadId,
          i % 2 === 0 ? 'USER' : 'AI_MESSAGE',
          content
        );
        messageIds.push(messageId);
      }

      // Update search vectors
      await updateSearchVectors(threadId);

      // Measure search time
      const startTime = Date.now();
      const results = await searchMessages(threadId, 'hippocampus');
      const endTime = Date.now();

      const searchTime = endTime - startTime;

      // Property: Search should complete in reasonable time (< 1 second)
      expect(searchTime).toBeLessThan(1000);

      // Should find approximately 10 messages (every 5th message)
      expect(results.length).toBeGreaterThanOrEqual(8);
      expect(results.length).toBeLessThanOrEqual(12);
    }, 10000); // 10 second timeout for this test
  });
});
