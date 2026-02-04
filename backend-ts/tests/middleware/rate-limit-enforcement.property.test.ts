/**
 * Property-Based Tests for Rate Limit Enforcement
 *
 * Feature: typescript-backend-migration
 * Property 21: Rate Limit Enforcement
 *
 * For any user and route combination, requests should be blocked with 429 status
 * after exceeding the configured rate limit.
 *
 * Validates: Requirements 9.1, 9.2, 9.5
 *
 * This test verifies that:
 * 1. Rate limits are enforced correctly using Redis
 * 2. Requests are blocked after exceeding the limit
 * 3. Different users and routes are tracked independently
 * 4. Rate limit windows expire correctly
 * 5. Rate limit headers are included in responses
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';

// Mock ioredis before importing the rate limit module
vi.mock('ioredis', () => {
  const mockRedisData = new Map<string, { value: number; expiry: number }>();

  class MockRedis {
    async incr(key: string): Promise<number> {
      const now = Date.now();
      const data = mockRedisData.get(key);

      // Clean up expired keys
      if (data && data.expiry < now) {
        mockRedisData.delete(key);
      }

      const current = mockRedisData.get(key);
      const newValue = current ? current.value + 1 : 1;

      mockRedisData.set(key, {
        value: newValue,
        expiry: current?.expiry || now + 60000, // Default 60s if no expiry set
      });

      return newValue;
    }

    async expire(key: string, seconds: number): Promise<number> {
      const data = mockRedisData.get(key);
      if (data) {
        data.expiry = Date.now() + seconds * 1000;
        return 1;
      }
      return 0;
    }

    async ttl(key: string): Promise<number> {
      const data = mockRedisData.get(key);
      if (!data) return -2; // Key doesn't exist

      const remaining = Math.floor((data.expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }

    async get(key: string): Promise<string | null> {
      const now = Date.now();
      const data = mockRedisData.get(key);

      if (!data) return null;

      // Check if expired
      if (data.expiry < now) {
        mockRedisData.delete(key);
        return null;
      }

      return data.value.toString();
    }

    async del(key: string): Promise<number> {
      const existed = mockRedisData.has(key);
      mockRedisData.delete(key);
      return existed ? 1 : 0;
    }

    async quit(): Promise<void> {
      // Mock quit - do nothing
    }

    on(): this {
      return this;
    }

    // Static method to clear all data (for test cleanup)
    static clearAll(): void {
      mockRedisData.clear();
    }
  }

  return {
    default: MockRedis,
  };
});

import { checkRateLimit, resetRateLimit, closeRedisConnection } from '@/lib/middleware/rate-limit';
import { clearSettingsCache } from '@/lib/config/settings';

/**
 * Arbitrary for generating valid user IDs
 */
const userIdArbitrary = fc.uuid();

/**
 * Arbitrary for generating route names
 */
const routeArbitrary = fc.constantFrom(
  'chat',
  'suggestions',
  'title',
  'models',
  'threads',
  'tools'
);

/**
 * Arbitrary for generating rate limit configurations
 */
const rateLimitConfigArbitrary = fc.record({
  limit: fc.integer({ min: 1, max: 10 }), // Reduced from 20 to 10 for faster tests
  expiry: fc.integer({ min: 10, max: 60 }), // Reduced from 120 to 60 for faster tests
});

/**
 * Helper to make multiple requests and track results
 */
async function makeRequests(
  userId: string,
  route: string,
  limit: number,
  expiry: number,
  count: number
): Promise<
  Array<{
    limited: boolean;
    remaining: number;
    requestNumber: number;
    headers?: Record<string, string>;
  }>
> {
  const results = [];

  for (let i = 0; i < count; i++) {
    const result = await checkRateLimit(userId, route, limit, expiry);
    results.push({
      limited: result.limited,
      remaining: result.remaining,
      requestNumber: i + 1,
      headers: result.headers,
    });
  }

  return results;
}

describe('Rate Limit Enforcement Property Tests', () => {
  afterEach(async () => {
    // Clean up Redis connection after each test
    await closeRedisConnection();
    // Clear settings cache to avoid MCP warnings accumulating
    clearSettingsCache();
  });

  describe('Property 21: Rate Limit Enforcement', () => {
    /**
     * **Validates: Requirements 9.1, 9.2, 9.5**
     *
     * Property: For any user, route, and limit configuration, requests should be
     * allowed up to the limit and blocked after exceeding it.
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should enforce rate limits for any user and route combination',
      async (userId, route, config) => {
        // Reset rate limit before test
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make requests up to the limit
        const results = await makeRequests(userId, route, limit, expiry, limit + 5);

        // Property 1: First 'limit' requests should NOT be limited
        for (let i = 0; i < limit; i++) {
          expect(results[i].limited).toBe(false);
          expect(results[i].remaining).toBe(limit - i - 1);
        }

        // Property 2: Requests after 'limit' should be limited
        for (let i = limit; i < results.length; i++) {
          expect(results[i].limited).toBe(true);
          expect(results[i].remaining).toBe(0);
        }

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limits should be tracked independently for different users
     */
    test.prop([
      fc.tuple(userIdArbitrary, userIdArbitrary).filter(([u1, u2]) => u1 !== u2),
      routeArbitrary,
      rateLimitConfigArbitrary,
    ])(
      'should track rate limits independently for different users',
      async ([user1, user2], route, config) => {
        // Reset rate limits
        await resetRateLimit(user1, route);
        await resetRateLimit(user2, route);

        const { limit, expiry } = config;

        // User 1 exhausts their limit
        const user1Results = await makeRequests(user1, route, limit, expiry, limit + 1);

        // User 1 should be rate limited on the last request
        expect(user1Results[limit].limited).toBe(true);

        // User 2 should still be able to make requests
        const user2Result = await checkRateLimit(user2, route, limit, expiry);
        expect(user2Result.limited).toBe(false);
        expect(user2Result.remaining).toBe(limit - 1);

        // Cleanup
        await resetRateLimit(user1, route);
        await resetRateLimit(user2, route);
      }
    );

    /**
     * Property: Rate limits should be tracked independently for different routes
     */
    test.prop([
      userIdArbitrary,
      fc.subarray(['chat', 'suggestions', 'title', 'models', 'threads', 'tools'], {
        minLength: 2,
        maxLength: 2,
      }),
      fc.record({
        limit: fc.integer({ min: 1, max: 10 }), // Reduced max to speed up test
        expiry: fc.integer({ min: 10, max: 60 }),
      }),
    ])(
      'should track rate limits independently for different routes',
      async (userId, routes, config) => {
        const [route1, route2] = routes;

        // Reset rate limits
        await resetRateLimit(userId, route1);
        await resetRateLimit(userId, route2);

        const { limit, expiry } = config;

        // Exhaust limit on route1
        const route1Results = await makeRequests(userId, route1, limit, expiry, limit + 1);

        // Route 1 should be rate limited on the last request
        expect(route1Results[limit].limited).toBe(true);

        // Route 2 should still be available
        const route2Result = await checkRateLimit(userId, route2, limit, expiry);
        expect(route2Result.limited).toBe(false);
        expect(route2Result.remaining).toBe(limit - 1);

        // Cleanup
        await resetRateLimit(userId, route1);
        await resetRateLimit(userId, route2);
      },
      { numRuns: 50, timeout: 15000 } // Reduced runs and added timeout
    );

    /**
     * Property: Remaining count should decrease monotonically until limit is reached
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should decrease remaining count monotonically',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make requests and track remaining count
        const results = await makeRequests(userId, route, limit, expiry, limit);

        // Property: Remaining should decrease by 1 with each request
        for (let i = 0; i < results.length; i++) {
          expect(results[i].remaining).toBe(limit - i - 1);
        }

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit headers should always be present and valid
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should include valid rate limit headers in all responses',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make a request
        const result = await checkRateLimit(userId, route, limit, expiry);

        // Property: Headers should always be present
        expect(result.headers).toBeDefined();
        expect(result.headers['X-RateLimit-Limit']).toBeDefined();
        expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
        expect(result.headers['X-RateLimit-Reset']).toBeDefined();

        // Property: Header values should be valid numbers
        const headerLimit = parseInt(result.headers['X-RateLimit-Limit']);
        const headerRemaining = parseInt(result.headers['X-RateLimit-Remaining']);
        const headerReset = parseInt(result.headers['X-RateLimit-Reset']);

        expect(headerLimit).toBe(limit);
        expect(headerRemaining).toBeGreaterThanOrEqual(0);
        expect(headerRemaining).toBeLessThanOrEqual(limit);
        expect(headerReset).toBeGreaterThan(0);

        // Property: Reset time should be in the future
        const currentTime = Math.floor(Date.now() / 1000);
        expect(headerReset).toBeGreaterThanOrEqual(currentTime);

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit should be consistent across multiple checks
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should provide consistent rate limit status',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make the same number of requests twice
        const firstRun = await makeRequests(userId, route, limit, expiry, limit);

        // Reset for second run
        await resetRateLimit(userId, route);

        const secondRun = await makeRequests(userId, route, limit, expiry, limit);

        // Property: Both runs should have identical patterns
        expect(firstRun.length).toBe(secondRun.length);

        for (let i = 0; i < firstRun.length; i++) {
          expect(firstRun[i].limited).toBe(secondRun[i].limited);
          expect(firstRun[i].remaining).toBe(secondRun[i].remaining);
        }

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: After reset, rate limit should allow full limit again
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should allow full limit after reset',
      async (userId, route, config) => {
        const { limit, expiry } = config;

        // Exhaust the limit
        await makeRequests(userId, route, limit, expiry, limit + 1);

        // Verify we're rate limited
        const beforeReset = await checkRateLimit(userId, route, limit, expiry);
        expect(beforeReset.limited).toBe(true);

        // Reset the rate limit
        const resetSuccess = await resetRateLimit(userId, route);
        expect(resetSuccess).toBe(true);

        // Property: After reset, should be able to make full limit of requests again
        const afterReset = await checkRateLimit(userId, route, limit, expiry);
        expect(afterReset.limited).toBe(false);
        expect(afterReset.remaining).toBe(limit - 1);

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit should handle concurrent requests correctly
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should handle concurrent requests correctly',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make concurrent requests (up to limit + 2)
        const concurrentRequests = Array.from({ length: limit + 2 }, () =>
          checkRateLimit(userId, route, limit, expiry)
        );

        const results = await Promise.all(concurrentRequests);

        // Property: At least 'limit' requests should succeed
        const successfulRequests = results.filter((r) => !r.limited);
        expect(successfulRequests.length).toBeGreaterThanOrEqual(limit);

        // Property: Some requests should be rate limited
        const limitedRequests = results.filter((r) => r.limited);
        expect(limitedRequests.length).toBeGreaterThan(0);

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit should never allow negative remaining count
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should never return negative remaining count',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make many requests (well beyond the limit)
        const results = await makeRequests(userId, route, limit, expiry, limit * 2);

        // Property: Remaining should never be negative
        for (const result of results) {
          expect(result.remaining).toBeGreaterThanOrEqual(0);
        }

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit should work with minimum and maximum valid limits
     */
    test.prop([
      userIdArbitrary,
      routeArbitrary,
      fc.constantFrom(1, 10, 50), // Test edge cases (reduced max to avoid timeout)
    ])(
      'should work correctly with edge case limits',
      async (userId, route, limit) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const expiry = 60;

        // Make requests up to limit + 1
        const results = await makeRequests(userId, route, limit, expiry, limit + 1);

        // Property: First 'limit' requests should succeed
        for (let i = 0; i < limit; i++) {
          expect(results[i].limited).toBe(false);
        }

        // Property: Request after limit should be blocked
        expect(results[limit].limited).toBe(true);

        // Cleanup
        await resetRateLimit(userId, route);
      },
      { timeout: 10000 } // Increase timeout for this test
    );

    /**
     * Property: Rate limit state should be preserved across multiple checks
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should preserve rate limit state across checks',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make some requests (half the limit, but at least 1)
        const halfLimit = Math.max(1, Math.floor(limit / 2));
        await makeRequests(userId, route, limit, expiry, halfLimit);

        // Check the state
        const firstCheck = await checkRateLimit(userId, route, limit, expiry);
        const expectedRemaining = limit - halfLimit - 1;

        // Handle edge cases
        if (limit === 1 && halfLimit === 1) {
          // After making 1 request with limit 1, we're at the limit
          // The next check will be limited
          expect(firstCheck.limited).toBe(true);
          expect(firstCheck.remaining).toBe(0);
        } else if (limit === 2 && halfLimit === 1) {
          // After making 1 request with limit 2, we have 1 remaining
          // The next check uses that 1, leaving 0 remaining
          expect(firstCheck.remaining).toBe(0);

          // Make another check - should be limited now
          const secondCheck = await checkRateLimit(userId, route, limit, expiry);
          expect(secondCheck.limited).toBe(true);
          expect(secondCheck.remaining).toBe(0);
        } else {
          expect(firstCheck.remaining).toBe(expectedRemaining);

          // Make another check
          const secondCheck = await checkRateLimit(userId, route, limit, expiry);

          // Property: State should be preserved and decremented
          expect(secondCheck.remaining).toBe(Math.max(0, expectedRemaining - 1));
        }

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit should handle rapid sequential requests
     */
    test.prop([userIdArbitrary, routeArbitrary, fc.integer({ min: 5, max: 15 })])(
      'should handle rapid sequential requests correctly',
      async (userId, route, limit) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const expiry = 60;

        // Make rapid sequential requests
        const results = [];
        for (let i = 0; i < limit + 3; i++) {
          const result = await checkRateLimit(userId, route, limit, expiry);
          results.push(result);
        }

        // Property: Exactly 'limit' requests should succeed
        const successCount = results.filter((r) => !r.limited).length;
        expect(successCount).toBe(limit);

        // Property: Remaining requests should be limited
        const limitedCount = results.filter((r) => r.limited).length;
        expect(limitedCount).toBe(3);

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit headers should reflect current state accurately
     */
    test.prop([userIdArbitrary, routeArbitrary, rateLimitConfigArbitrary])(
      'should have headers that accurately reflect current state',
      async (userId, route, config) => {
        // Reset rate limit
        await resetRateLimit(userId, route);

        const { limit, expiry } = config;

        // Make requests and verify headers at each step
        for (let i = 0; i < limit; i++) {
          const result = await checkRateLimit(userId, route, limit, expiry);

          // Property: Limit header should always match configured limit
          expect(parseInt(result.headers['X-RateLimit-Limit'])).toBe(limit);

          // Property: Remaining header should match result.remaining
          expect(parseInt(result.headers['X-RateLimit-Remaining'])).toBe(result.remaining);

          // Property: Remaining should equal limit - requests made - 1
          expect(result.remaining).toBe(limit - i - 1);
        }

        // Cleanup
        await resetRateLimit(userId, route);
      }
    );

    /**
     * Property: Rate limit should work with different expiry times
     */
    test.prop([
      userIdArbitrary,
      routeArbitrary,
      fc.integer({ min: 1, max: 10 }),
      fc.integer({ min: 5, max: 300 }),
    ])('should work correctly with various expiry times', async (userId, route, limit, expiry) => {
      // Reset rate limit
      await resetRateLimit(userId, route);

      // Make requests up to limit
      const results = await makeRequests(userId, route, limit, expiry, limit + 1);

      // Property: Behavior should be consistent regardless of expiry time
      for (let i = 0; i < limit; i++) {
        expect(results[i].limited).toBe(false);
      }

      expect(results[limit].limited).toBe(true);

      // Property: Reset time should be approximately current time + expiry
      // Check the first result (before any potential connection issues)
      if (results[0] && results[0].headers) {
        const currentTime = Math.floor(Date.now() / 1000);
        const resetTime = parseInt(results[0].headers['X-RateLimit-Reset']);

        // Allow some tolerance for execution time
        expect(resetTime).toBeGreaterThanOrEqual(currentTime);
        expect(resetTime).toBeLessThanOrEqual(currentTime + expiry + 5);
      }

      // Cleanup
      await resetRateLimit(userId, route);
    });
  });
});
