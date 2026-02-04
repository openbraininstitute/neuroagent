/**
 * Property-Based Tests for Rate Limit Headers
 *
 * Feature: typescript-backend-migration
 * Property 22: Rate Limit Headers
 *
 * For any rate-limited request, the response should include X-RateLimit-Limit,
 * X-RateLimit-Remaining, and X-RateLimit-Reset headers with correct values.
 *
 * Validates: Requirements 9.3
 *
 * This test verifies that:
 * 1. All rate-limited responses include the three required headers
 * 2. Header values are correctly formatted as strings
 * 3. Header values represent valid numeric data
 * 4. X-RateLimit-Limit matches the configured limit
 * 5. X-RateLimit-Remaining is non-negative and <= limit
 * 6. X-RateLimit-Reset is a valid future timestamp
 * 7. Headers are consistent across multiple requests
 * 8. Headers are present even when rate limit is exceeded
 */

import { describe, beforeEach, afterEach } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  generateRateLimitHeaders,
  closeRedisConnection,
} from '@/lib/middleware/rate-limit';

describe('Rate Limit Headers Property Tests', () => {
  // Clean up after all tests
  afterEach(async () => {
    await closeRedisConnection();
  });

  describe('Property 22: Rate Limit Headers', () => {
    /**
     * **Validates: Requirements 9.3**
     *
     * Test that all rate-limited responses include the three required headers
     * with correct values for any valid configuration.
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.string({ minLength: 1, maxLength: 20 }), // route
      fc.integer({ min: 1, max: 1000 }), // limit
      fc.integer({ min: 1, max: 3600 }), // expiry in seconds
    ])(
      'should include all required rate limit headers for any configuration',
      async (userId, route, limit, expiry) => {
        // Reset rate limit before test
        await resetRateLimit(userId, route);

        try {
          // Make a rate limit check
          const result = await checkRateLimit(userId, route, limit, expiry);

          // Property: All three headers must be present
          expect(result.headers).toHaveProperty('X-RateLimit-Limit');
          expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
          expect(result.headers).toHaveProperty('X-RateLimit-Reset');

          // Property: Headers must be strings (HTTP header requirement)
          expect(typeof result.headers['X-RateLimit-Limit']).toBe('string');
          expect(typeof result.headers['X-RateLimit-Remaining']).toBe('string');
          expect(typeof result.headers['X-RateLimit-Reset']).toBe('string');

          // Property: Header values must be parseable as numbers
          const parsedLimit = parseInt(result.headers['X-RateLimit-Limit'] ?? '0', 10);
          const parsedRemaining = parseInt(result.headers['X-RateLimit-Remaining'] ?? '0', 10);
          const parsedReset = parseInt(result.headers['X-RateLimit-Reset'] ?? '0', 10);

          expect(Number.isNaN(parsedLimit)).toBe(false);
          expect(Number.isNaN(parsedRemaining)).toBe(false);
          expect(Number.isNaN(parsedReset)).toBe(false);

          // Property: X-RateLimit-Limit must match the configured limit
          expect(parsedLimit).toBe(limit);

          // Property: X-RateLimit-Remaining must be non-negative
          expect(parsedRemaining).toBeGreaterThanOrEqual(0);

          // Property: X-RateLimit-Remaining must be <= limit
          expect(parsedRemaining).toBeLessThanOrEqual(limit);

          // Property: X-RateLimit-Reset must be a valid timestamp (positive number)
          expect(parsedReset).toBeGreaterThan(0);

          // Property: X-RateLimit-Reset should be in the future (or very recent past due to timing)
          const currentTime = Math.floor(Date.now() / 1000);
          // Allow some tolerance for test execution time
          expect(parsedReset).toBeGreaterThanOrEqual(currentTime - 5);
        } finally {
          // Cleanup
          await resetRateLimit(userId, route);
        }
      }
    );

    /**
     * Test that headers are present even when rate limit is exceeded
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.string({ minLength: 1, maxLength: 20 }), // route
      fc.integer({ min: 1, max: 10 }), // small limit for easy exceeding
      fc.integer({ min: 60, max: 300 }), // expiry
    ])(
      'should include headers even when rate limit is exceeded',
      async (userId, route, limit, expiry) => {
        await resetRateLimit(userId, route);

        try {
          // Consume all allowed requests
          for (let i = 0; i < limit; i++) {
            await checkRateLimit(userId, route, limit, expiry);
          }

          // Make request that exceeds limit
          const result = await checkRateLimit(userId, route, limit, expiry);

          // Property: Headers must still be present when limited
          expect(result.limited).toBe(true);
          expect(result.headers).toHaveProperty('X-RateLimit-Limit');
          expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
          expect(result.headers).toHaveProperty('X-RateLimit-Reset');

          // Property: X-RateLimit-Remaining should be 0 when exceeded
          expect(parseInt(result.headers['X-RateLimit-Remaining'] ?? '0', 10)).toBe(0);

          // Property: X-RateLimit-Limit should still match configured limit
          expect(parseInt(result.headers['X-RateLimit-Limit'] ?? '0', 10)).toBe(limit);
        } finally {
          await resetRateLimit(userId, route);
        }
      }
    );

    /**
     * Test that remaining count decreases correctly with each request
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.string({ minLength: 1, maxLength: 20 }), // route
      fc.integer({ min: 5, max: 20 }), // limit (reasonable size for iteration)
      fc.integer({ min: 60, max: 300 }), // expiry
    ])(
      'should decrement X-RateLimit-Remaining with each request',
      async (userId, route, limit, expiry) => {
        await resetRateLimit(userId, route);

        try {
          let previousRemaining = limit;

          for (let i = 0; i < limit; i++) {
            const result = await checkRateLimit(userId, route, limit, expiry);

            const remaining = parseInt(result.headers['X-RateLimit-Remaining'] ?? '0', 10);

            // Property: Remaining should decrease by 1 with each request
            expect(remaining).toBe(previousRemaining - 1);

            // Property: Remaining should never be negative (clamped to 0)
            expect(remaining).toBeGreaterThanOrEqual(0);

            previousRemaining = remaining;
          }

          // After consuming all requests, remaining should be 0
          expect(previousRemaining).toBe(0);
        } finally {
          await resetRateLimit(userId, route);
        }
      }
    );

    /**
     * Test that X-RateLimit-Reset timestamp is consistent within the same window
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.string({ minLength: 1, maxLength: 20 }), // route
      fc.integer({ min: 5, max: 20 }), // limit
      fc.integer({ min: 60, max: 300 }), // expiry
    ])(
      'should maintain consistent X-RateLimit-Reset within same window',
      async (userId, route, limit, expiry) => {
        await resetRateLimit(userId, route);

        try {
          // Make first request to establish window
          const firstResult = await checkRateLimit(userId, route, limit, expiry);
          const firstReset = parseInt(firstResult.headers['X-RateLimit-Reset'] ?? '0', 10);

          // Make several more requests in quick succession
          for (let i = 0; i < Math.min(3, limit - 1); i++) {
            const result = await checkRateLimit(userId, route, limit, expiry);
            const reset = parseInt(result.headers['X-RateLimit-Reset'] ?? '0', 10);

            // Property: Reset time should be the same (or very close) within the same window
            // Allow 1 second tolerance for timing variations
            expect(Math.abs(reset - firstReset)).toBeLessThanOrEqual(1);
          }
        } finally {
          await resetRateLimit(userId, route);
        }
      }
    );

    /**
     * Test that getRateLimitStatus also returns correct headers
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.string({ minLength: 1, maxLength: 20 }), // route
      fc.integer({ min: 1, max: 100 }), // limit
      fc.integer({ min: 60, max: 300 }), // expiry
      fc.integer({ min: 0, max: 5 }), // number of requests to make first
    ])(
      'should return correct headers from getRateLimitStatus',
      async (userId, route, limit, expiry, requestCount) => {
        await resetRateLimit(userId, route);

        try {
          // Make some requests
          for (let i = 0; i < Math.min(requestCount, limit); i++) {
            await checkRateLimit(userId, route, limit, expiry);
          }

          // Get status without incrementing
          const status = await getRateLimitStatus(userId, route, limit, expiry);

          // Property: Status should include all headers
          expect(status.headers).toHaveProperty('X-RateLimit-Limit');
          expect(status.headers).toHaveProperty('X-RateLimit-Remaining');
          expect(status.headers).toHaveProperty('X-RateLimit-Reset');

          // Property: Limit should match configuration
          expect(parseInt(status.headers['X-RateLimit-Limit'] ?? '0', 10)).toBe(limit);

          // Property: Remaining should reflect actual state
          const expectedRemaining = Math.max(0, limit - Math.min(requestCount, limit));
          expect(parseInt(status.headers['X-RateLimit-Remaining'] ?? '0', 10)).toBe(
            expectedRemaining
          );
        } finally {
          await resetRateLimit(userId, route);
        }
      }
    );

    /**
     * Test generateRateLimitHeaders function directly
     */
    test.prop([
      fc.integer({ min: 1, max: 10000 }), // limit
      fc.integer({ min: 0, max: 10000 }), // remaining
      fc.integer({ min: 1000000000, max: 2000000000 }), // reset timestamp
    ])('should generate valid headers for any input values', (limit, remaining, resetTime) => {
      const headers = generateRateLimitHeaders(limit, remaining, resetTime);

      // Property: All three headers must be present
      expect(headers).toHaveProperty('X-RateLimit-Limit');
      expect(headers).toHaveProperty('X-RateLimit-Remaining');
      expect(headers).toHaveProperty('X-RateLimit-Reset');

      // Property: Values must be strings
      expect(typeof headers['X-RateLimit-Limit']).toBe('string');
      expect(typeof headers['X-RateLimit-Remaining']).toBe('string');
      expect(typeof headers['X-RateLimit-Reset']).toBe('string');

      // Property: Values must match input (as strings)
      expect(headers['X-RateLimit-Limit']).toBe(limit.toString());
      expect(headers['X-RateLimit-Reset']).toBe(resetTime.toString());

      // Property: Remaining should be clamped to 0 if negative
      const expectedRemaining = Math.max(0, remaining);
      expect(headers['X-RateLimit-Remaining']).toBe(expectedRemaining.toString());
    });

    /**
     * Test that negative remaining values are clamped to 0
     */
    test.prop([
      fc.integer({ min: 1, max: 100 }), // limit
      fc.integer({ min: -1000, max: -1 }), // negative remaining
      fc.integer({ min: 1000000000, max: 2000000000 }), // reset
    ])('should clamp negative remaining values to 0', (limit, negativeRemaining, resetTime) => {
      const headers = generateRateLimitHeaders(limit, negativeRemaining, resetTime);

      // Property: Negative remaining should be clamped to 0
      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });

    /**
     * Test header consistency across different users and routes
     */
    test.prop([
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }), // userIds
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }), // routes
      fc.integer({ min: 5, max: 20 }), // limit
      fc.integer({ min: 60, max: 300 }), // expiry
    ])(
      'should provide consistent headers for different users and routes',
      async (userIds, routes, limit, expiry) => {
        // Ensure unique userIds and routes
        const uniqueUsers = [...new Set(userIds)];
        const uniqueRoutes = [...new Set(routes)];

        try {
          // Test each user/route combination
          for (const userId of uniqueUsers) {
            for (const route of uniqueRoutes) {
              await resetRateLimit(userId, route);

              const result = await checkRateLimit(userId, route, limit, expiry);

              // Property: All combinations should have valid headers
              expect(result.headers).toHaveProperty('X-RateLimit-Limit');
              expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
              expect(result.headers).toHaveProperty('X-RateLimit-Reset');

              // Property: Limit should always match configuration
              expect(parseInt(result.headers['X-RateLimit-Limit'] ?? '0', 10)).toBe(limit);

              // Property: First request should have remaining = limit - 1
              expect(parseInt(result.headers['X-RateLimit-Remaining'] ?? '0', 10)).toBe(limit - 1);
            }
          }
        } finally {
          // Cleanup all combinations
          for (const userId of uniqueUsers) {
            for (const route of uniqueRoutes) {
              await resetRateLimit(userId, route);
            }
          }
        }
      }
    );

    /**
     * Test that headers are present in the result object structure
     */
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }), // userId
      fc.string({ minLength: 1, maxLength: 20 }), // route
      fc.integer({ min: 1, max: 100 }), // limit
      fc.integer({ min: 60, max: 300 }), // expiry
    ])(
      'should return headers in the correct result structure',
      async (userId, route, limit, expiry) => {
        await resetRateLimit(userId, route);

        try {
          const result = await checkRateLimit(userId, route, limit, expiry);

          // Property: Result should have the expected structure
          expect(result).toHaveProperty('limited');
          expect(result).toHaveProperty('headers');
          expect(result).toHaveProperty('remaining');
          expect(result).toHaveProperty('limit');
          expect(result).toHaveProperty('reset');

          // Property: headers should be an object
          expect(typeof result.headers).toBe('object');
          expect(result.headers).not.toBeNull();

          // Property: headers object should have exactly 3 properties
          expect(Object.keys(result.headers)).toHaveLength(3);

          // Property: Result fields should be consistent with headers
          expect(result.limit).toBe(parseInt(result.headers['X-RateLimit-Limit'] ?? '0', 10));
          expect(result.remaining).toBe(
            parseInt(result.headers['X-RateLimit-Remaining'] ?? '0', 10)
          );
          expect(result.reset).toBe(parseInt(result.headers['X-RateLimit-Reset'] ?? '0', 10));
        } finally {
          await resetRateLimit(userId, route);
        }
      }
    );

    /**
     * Test that header values are always non-empty strings
     */
    test.prop([
      fc.integer({ min: 0, max: 10000 }), // limit
      fc.integer({ min: -100, max: 10000 }), // remaining (can be negative)
      fc.integer({ min: 0, max: 2000000000 }), // reset
    ])('should never return empty header values', (limit, remaining, resetTime) => {
      const headers = generateRateLimitHeaders(limit, remaining, resetTime);

      // Property: Header values should never be empty strings
      expect(headers['X-RateLimit-Limit']).not.toBe('');
      expect(headers['X-RateLimit-Remaining']).not.toBe('');
      expect(headers['X-RateLimit-Reset']).not.toBe('');

      // Property: Header values should have length > 0
      expect(headers['X-RateLimit-Limit']?.length).toBeGreaterThan(0);
      expect(headers['X-RateLimit-Remaining']?.length).toBeGreaterThan(0);
      expect(headers['X-RateLimit-Reset']?.length).toBeGreaterThan(0);
    });
  });
});
