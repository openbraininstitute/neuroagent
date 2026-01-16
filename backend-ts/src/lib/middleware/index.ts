/**
 * Middleware exports for authentication, rate limiting, and other request processing.
 */

export {
  validateAuth,
  validateAuthOptional,
  validateProject,
  validateVirtualLabAccess,
  validateProjectAccess,
  AuthenticationError,
  AuthorizationError,
  type UserInfo,
} from './auth';

export {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  generateRateLimitHeaders,
  closeRedisConnection,
  RateLimitError,
  type RateLimitResult,
} from './rate-limit';
