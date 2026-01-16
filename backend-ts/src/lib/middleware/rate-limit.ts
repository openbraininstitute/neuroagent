/**
 * Rate limiting middleware using Redis for state management.
 * 
 * Provides functions for:
 * - Rate limit checking with Redis-based counters
 * - Rate limit header generation
 * - Support for different limits per route
 * - Graceful degradation when Redis is unavailable or disabled
 */

import Redis from 'ioredis';

import { getSettings } from '../config/settings';

/**
 * Rate limit result containing limit status and headers
 */
export interface RateLimitResult {
  limited: boolean;
  headers: Record<string, string>;
  remaining: number;
  limit: number;
  reset: number;
}

/**
 * Custom error for rate limit configuration issues
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Singleton Redis client instance
 */
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for rate limiting.
 * 
 * Returns null if rate limiting is disabled or Redis connection fails.
 * Uses singleton pattern to reuse connection across requests.
 * 
 * @returns Redis client instance or null if disabled/unavailable
 */
function getRedisClient(): Redis | null {
  const settings = getSettings();

  // Return null if rate limiting is disabled
  if (settings.rateLimiter.disabled) {
    return null;
  }

  // Return existing client if already initialized
  if (redisClient) {
    return redisClient;
  }

  try {
    // Create new Redis client
    redisClient = new Redis({
      host: settings.rateLimiter.redisHost,
      port: settings.rateLimiter.redisPort,
      password: settings.rateLimiter.redisPassword,
      tls: settings.rateLimiter.redisSsl ? {} : undefined,
      retryStrategy: (times: number) => {
        // Retry connection with exponential backoff
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Handle connection errors
    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    // Log successful connection
    redisClient.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('Redis client connected for rate limiting');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Close Redis connection (useful for cleanup in tests or shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Generate rate limit headers for HTTP response.
 * 
 * Headers follow standard rate limiting conventions:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the limit resets
 * 
 * @param limit - Maximum number of requests allowed
 * @param remaining - Number of requests remaining
 * @param resetTime - Unix timestamp (seconds) when limit resets
 * @returns Object with rate limit headers
 */
export function generateRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
    'X-RateLimit-Reset': resetTime.toString(),
  };
}

/**
 * Check rate limit for a user and route combination.
 * 
 * This function:
 * 1. Generates a unique Redis key for the user/route combination
 * 2. Increments the request counter in Redis
 * 3. Sets expiration on first request in the window
 * 4. Calculates remaining requests and reset time
 * 5. Returns rate limit status and headers
 * 
 * If Redis is unavailable or rate limiting is disabled, returns unlimited access.
 * 
 * @param userId - Unique user identifier (typically from JWT sub claim)
 * @param route - Route identifier (e.g., 'chat', 'suggestions', 'title')
 * @param limit - Maximum number of requests allowed in the time window
 * @param expiry - Time window in seconds
 * @returns Rate limit result with status and headers
 * 
 * @example
 * ```typescript
 * const result = await checkRateLimit(
 *   userInfo.sub,
 *   'chat',
 *   settings.rateLimiter.limitChat,
 *   settings.rateLimiter.expiryChat
 * );
 * 
 * if (result.limited) {
 *   return new Response('Rate limit exceeded', {
 *     status: 429,
 *     headers: result.headers,
 *   });
 * }
 * ```
 */
export async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
  expiry: number
): Promise<RateLimitResult> {
  const client = getRedisClient();

  // If Redis is unavailable or disabled, allow unlimited access
  if (!client) {
    return {
      limited: false,
      headers: generateRateLimitHeaders(limit, limit, Date.now() + expiry * 1000),
      remaining: limit,
      limit,
      reset: Date.now() + expiry * 1000,
    };
  }

  try {
    // Generate unique key for this user/route combination
    const key = `rate-limit:${userId}:${route}`;

    // Increment counter and get current value
    const current = await client.incr(key);

    // Set expiration on first request in the window
    if (current === 1) {
      await client.expire(key, expiry);
    }

    // Get TTL to calculate reset time
    const ttl = await client.ttl(key);

    // Calculate reset time (current time + TTL)
    const resetTime = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

    // Calculate remaining requests
    const remaining = limit - current;

    // Generate headers
    const headers = generateRateLimitHeaders(limit, remaining, resetTime);

    // Check if limit exceeded
    const limited = current > limit;

    return {
      limited,
      headers,
      remaining: Math.max(0, remaining),
      limit,
      reset: resetTime,
    };
  } catch (error) {
    // Log error but don't block request if Redis fails
    console.error('Rate limit check failed:', error);

    // Return unlimited access on error (fail open)
    return {
      limited: false,
      headers: generateRateLimitHeaders(limit, limit, Date.now() + expiry * 1000),
      remaining: limit,
      limit,
      reset: Math.floor(Date.now() / 1000) + expiry,
    };
  }
}

/**
 * Reset rate limit for a specific user and route.
 * 
 * Useful for testing or administrative purposes.
 * 
 * @param userId - User identifier
 * @param route - Route identifier
 * @returns True if reset was successful, false otherwise
 */
export async function resetRateLimit(userId: string, route: string): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    const key = `rate-limit:${userId}:${route}`;
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
}

/**
 * Get current rate limit status without incrementing counter.
 * 
 * Useful for checking rate limit status without consuming a request.
 * 
 * @param userId - User identifier
 * @param route - Route identifier
 * @param limit - Maximum number of requests allowed
 * @param expiry - Time window in seconds
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  userId: string,
  route: string,
  limit: number,
  expiry: number
): Promise<RateLimitResult> {
  const client = getRedisClient();

  // If Redis is unavailable or disabled, return unlimited status
  if (!client) {
    return {
      limited: false,
      headers: generateRateLimitHeaders(limit, limit, Date.now() + expiry * 1000),
      remaining: limit,
      limit,
      reset: Math.floor(Date.now() / 1000) + expiry,
    };
  }

  try {
    const key = `rate-limit:${userId}:${route}`;

    // Get current counter value without incrementing
    const current = await client.get(key);
    const currentCount = current ? parseInt(current, 10) : 0;

    // Get TTL
    const ttl = await client.ttl(key);

    // Calculate reset time
    const resetTime = Math.floor(Date.now() / 1000) + Math.max(ttl, expiry);

    // Calculate remaining requests
    const remaining = limit - currentCount;

    // Generate headers
    const headers = generateRateLimitHeaders(limit, remaining, resetTime);

    return {
      limited: currentCount >= limit,
      headers,
      remaining: Math.max(0, remaining),
      limit,
      reset: resetTime,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);

    // Return unlimited status on error
    return {
      limited: false,
      headers: generateRateLimitHeaders(limit, limit, Date.now() + expiry * 1000),
      remaining: limit,
      limit,
      reset: Math.floor(Date.now() / 1000) + expiry,
    };
  }
}
