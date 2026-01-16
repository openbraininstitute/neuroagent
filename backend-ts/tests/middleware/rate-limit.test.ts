/**
 * Tests for rate limiting middleware
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  generateRateLimitHeaders,
  closeRedisConnection,
} from '@/lib/middleware/rate-limit';

describe('Rate Limiting Middleware', () => {
  const userId = 'test-user-123';
  const route = 'test-route';
  const limit = 5;
  const expiry = 60;

  beforeEach(async () => {
    // Reset rate limit before each test
    await resetRateLimit(userId, route);
  });

  afterEach(async () => {
    // Clean up Redis connection after tests
    await closeRedisConnection();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < limit; i++) {
        const result = await checkRateLimit(userId, route, limit, expiry);
        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(limit - i - 1);
        expect(result.limit).toBe(limit);
      }
    });

    it('should block requests after limit exceeded', async () => {
      // Consume all allowed requests
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(userId, route, limit, expiry);
      }

      // Next request should be blocked
      const result = await checkRateLimit(userId, route, limit, expiry);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should include correct rate limit headers', async () => {
      const result = await checkRateLimit(userId, route, limit, expiry);

      expect(result.headers['X-RateLimit-Limit']).toBe(limit.toString());
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();

      // Verify header values are numbers
      expect(parseInt(result.headers['X-RateLimit-Limit'])).toBe(limit);
      expect(parseInt(result.headers['X-RateLimit-Remaining'])).toBeGreaterThanOrEqual(0);
      expect(parseInt(result.headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
    });

    it('should track different users separately', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 makes requests
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(user1, route, limit, expiry);
      }

      // User 1 should be rate limited
      const result1 = await checkRateLimit(user1, route, limit, expiry);
      expect(result1.limited).toBe(true);

      // User 2 should still be able to make requests
      const result2 = await checkRateLimit(user2, route, limit, expiry);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(limit - 1);

      // Cleanup
      await resetRateLimit(user1, route);
      await resetRateLimit(user2, route);
    });

    it('should track different routes separately', async () => {
      const route1 = 'route-1';
      const route2 = 'route-2';

      // Consume limit on route 1
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(userId, route1, limit, expiry);
      }

      // Route 1 should be rate limited
      const result1 = await checkRateLimit(userId, route1, limit, expiry);
      expect(result1.limited).toBe(true);

      // Route 2 should still be available
      const result2 = await checkRateLimit(userId, route2, limit, expiry);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(limit - 1);

      // Cleanup
      await resetRateLimit(userId, route1);
      await resetRateLimit(userId, route2);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status without incrementing counter', async () => {
      // Make one request
      await checkRateLimit(userId, route, limit, expiry);

      // Check status multiple times
      for (let i = 0; i < 3; i++) {
        const status = await getRateLimitStatus(userId, route, limit, expiry);
        expect(status.limited).toBe(false);
        expect(status.remaining).toBe(limit - 1); // Should stay at limit - 1
      }
    });

    it('should show limited status when limit exceeded', async () => {
      // Consume all requests
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(userId, route, limit, expiry);
      }

      // Status should show limited
      const status = await getRateLimitStatus(userId, route, limit, expiry);
      expect(status.limited).toBe(true);
      expect(status.remaining).toBe(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit counter', async () => {
      // Consume some requests
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(userId, route, limit, expiry);
      }

      // Reset counter
      const resetSuccess = await resetRateLimit(userId, route);
      expect(resetSuccess).toBe(true);

      // Should be able to make full limit of requests again
      const result = await checkRateLimit(userId, route, limit, expiry);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(limit - 1);
    });
  });

  describe('generateRateLimitHeaders', () => {
    it('should generate correct headers', () => {
      const testLimit = 100;
      const testRemaining = 75;
      const testReset = 1234567890;

      const headers = generateRateLimitHeaders(testLimit, testRemaining, testReset);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('75');
      expect(headers['X-RateLimit-Reset']).toBe('1234567890');
    });

    it('should handle zero remaining requests', () => {
      const headers = generateRateLimitHeaders(10, 0, Date.now());

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });

    it('should handle negative remaining as zero', () => {
      const headers = generateRateLimitHeaders(10, -5, Date.now());

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });
});
