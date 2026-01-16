# Middleware

This directory contains middleware functions for request processing, authentication, and authorization.

## Authentication Middleware (`auth.ts`)

Provides JWT-based authentication using Keycloak as the identity provider.

### Key Functions

#### `validateAuth(request: NextRequest): Promise<UserInfo>`

Validates JWT token and extracts user information. Throws `AuthenticationError` if validation fails.

**Usage:**
```typescript
import { validateAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const userInfo = await validateAuth(request);
    console.log(`User ID: ${userInfo.sub}`);
    console.log(`Groups: ${userInfo.groups.join(', ')}`);
    // ... handle authenticated request
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return new Response('Unauthorized', { status: 401 });
    }
    throw error;
  }
}
```

#### `validateAuthOptional(request: NextRequest): Promise<UserInfo | null>`

Non-throwing variant that returns `null` instead of throwing an error. Useful for optional authentication.

**Usage:**
```typescript
import { validateAuthOptional } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const userInfo = await validateAuthOptional(request);
  
  if (userInfo) {
    // Authenticated user
    console.log(`Authenticated as: ${userInfo.email}`);
  } else {
    // Anonymous user
    console.log('Anonymous access');
  }
}
```

#### `validateProject(groups: string[], vlabId?: string, projectId?: string): void`

Validates user access to virtual labs and projects. Throws `AuthorizationError` if access is denied.

**Usage:**
```typescript
import { validateAuth, validateProject } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const userInfo = await validateAuth(request);
  
  // Validate virtual lab access
  validateProject(userInfo.groups, 'vlab-id');
  
  // Validate project access (also validates vlab access)
  validateProject(userInfo.groups, 'vlab-id', 'project-id');
}
```

#### `validateVirtualLabAccess(groups: string[], vlabId: string): void`

Validates user belongs to a specific virtual lab. Throws `AuthorizationError` if access is denied.

**Usage:**
```typescript
import { validateVirtualLabAccess } from '@/lib/middleware/auth';

validateVirtualLabAccess(userInfo.groups, 'vlab-id');
```

#### `validateProjectAccess(groups: string[], vlabId: string, projectId: string): void`

Validates user belongs to a specific project within a virtual lab. Throws `AuthorizationError` if access is denied.

**Usage:**
```typescript
import { validateProjectAccess } from '@/lib/middleware/auth';

validateProjectAccess(userInfo.groups, 'vlab-id', 'project-id');
```

### Types

#### `UserInfo`

User information extracted from JWT token:

```typescript
interface UserInfo {
  sub: string;                    // User ID (UUID)
  groups: string[];               // Group memberships
  emailVerified?: boolean;        // Email verification status
  name?: string;                  // Full name
  preferredUsername?: string;     // Username
  givenName?: string;            // First name
  familyName?: string;           // Last name
  email?: string;                // Email address
}
```

### Error Types

#### `AuthenticationError`

Thrown when JWT validation fails (missing token, invalid token, expired token).

#### `AuthorizationError`

Thrown when user doesn't have required permissions (virtual lab or project access).

### Group Format

User groups follow these formats:
- Virtual lab membership: `/vlab/{vlabId}`
- Project membership: `/proj/{vlabId}/{projectId}`

### Configuration

Authentication requires Keycloak configuration in environment variables:

```env
NEUROAGENT_KEYCLOAK__ISSUER=https://example.com/auth/realms/realm-name
```

The middleware automatically constructs the JWKS endpoint URL:
```
{issuer}/protocol/openid-connect/certs
```

### Security Features

1. **JWT Signature Verification**: Uses Keycloak's public keys (JWKS) to verify token signatures
2. **Token Expiration**: Automatically validates token expiration
3. **Issuer Validation**: Ensures tokens are issued by the configured Keycloak realm
4. **Group-Based Authorization**: Validates access based on user group memberships

### Example: Protected API Route

```typescript
import { NextRequest } from 'next/server';
import { validateAuth, validateProject, AuthenticationError, AuthorizationError } from '@/lib/middleware/auth';
import { prisma } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { thread_id: string } }
) {
  try {
    // Validate authentication
    const userInfo = await validateAuth(request);
    
    // Get thread from database
    const thread = await prisma.thread.findUnique({
      where: { id: params.thread_id },
    });
    
    if (!thread) {
      return new Response('Thread not found', { status: 404 });
    }
    
    // Validate thread ownership
    if (thread.userId !== userInfo.sub) {
      return new Response('Forbidden', { status: 403 });
    }
    
    // Validate project access
    if (thread.vlabId && thread.projectId) {
      validateProject(userInfo.groups, thread.vlabId, thread.projectId);
    }
    
    // Return thread data
    return Response.json(thread);
    
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return new Response('Forbidden', { status: 403 });
    }
    throw error;
  }
}
```

## Testing

Tests are located in `tests/middleware/auth.test.ts`.

Run tests:
```bash
npm test -- tests/middleware/auth.test.ts
```

The test suite covers:
- Virtual lab access validation
- Project access validation
- Combined validation scenarios
- Authentication with missing/invalid tokens
- Optional authentication
- Error handling


## Rate Limiting Middleware (`rate-limit.ts`)

Provides Redis-based rate limiting for API endpoints with configurable limits per route.

### Key Functions

#### `checkRateLimit(userId: string, route: string, limit: number, expiry: number): Promise<RateLimitResult>`

Checks rate limit for a user and route combination. Increments the request counter and returns rate limit status with headers.

**Parameters:**
- `userId`: Unique user identifier (typically from JWT sub claim)
- `route`: Route identifier (e.g., 'chat', 'suggestions', 'title')
- `limit`: Maximum number of requests allowed in the time window
- `expiry`: Time window in seconds

**Returns:** `RateLimitResult` with:
- `limited`: Boolean indicating if rate limit is exceeded
- `headers`: Rate limit headers for HTTP response
- `remaining`: Number of requests remaining
- `limit`: Maximum requests allowed
- `reset`: Unix timestamp when limit resets

**Usage:**
```typescript
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { getSettings } from '@/lib/config/settings';

export async function POST(request: NextRequest) {
  const settings = getSettings();
  const userInfo = await validateAuth(request);
  
  // Check rate limit
  const rateLimitResult = await checkRateLimit(
    userInfo.sub,
    'chat',
    settings.rateLimiter.limitChat,
    settings.rateLimiter.expiryChat
  );
  
  if (rateLimitResult.limited) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: rateLimitResult.headers,
    });
  }
  
  // Process request...
  return new Response('Success', {
    headers: rateLimitResult.headers,
  });
}
```

#### `getRateLimitStatus(userId: string, route: string, limit: number, expiry: number): Promise<RateLimitResult>`

Gets current rate limit status without incrementing the counter. Useful for checking status without consuming a request.

**Usage:**
```typescript
import { getRateLimitStatus } from '@/lib/middleware/rate-limit';

const status = await getRateLimitStatus(
  userInfo.sub,
  'chat',
  settings.rateLimiter.limitChat,
  settings.rateLimiter.expiryChat
);

console.log(`Remaining requests: ${status.remaining}`);
console.log(`Resets at: ${new Date(status.reset * 1000)}`);
```

#### `resetRateLimit(userId: string, route: string): Promise<boolean>`

Resets rate limit for a specific user and route. Useful for testing or administrative purposes.

**Usage:**
```typescript
import { resetRateLimit } from '@/lib/middleware/rate-limit';

const success = await resetRateLimit(userInfo.sub, 'chat');
if (success) {
  console.log('Rate limit reset successfully');
}
```

#### `generateRateLimitHeaders(limit: number, remaining: number, resetTime: number): Record<string, string>`

Generates standard rate limit headers for HTTP responses.

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

**Usage:**
```typescript
import { generateRateLimitHeaders } from '@/lib/middleware/rate-limit';

const headers = generateRateLimitHeaders(100, 75, Date.now() + 3600);
// Returns:
// {
//   'X-RateLimit-Limit': '100',
//   'X-RateLimit-Remaining': '75',
//   'X-RateLimit-Reset': '1234567890'
// }
```

#### `closeRedisConnection(): Promise<void>`

Closes the Redis connection. Useful for cleanup in tests or application shutdown.

**Usage:**
```typescript
import { closeRedisConnection } from '@/lib/middleware/rate-limit';

// In test cleanup or shutdown handler
await closeRedisConnection();
```

### Types

#### `RateLimitResult`

Rate limit check result:

```typescript
interface RateLimitResult {
  limited: boolean;           // True if rate limit exceeded
  headers: Record<string, string>;  // Rate limit headers
  remaining: number;          // Requests remaining
  limit: number;             // Maximum requests allowed
  reset: number;             // Unix timestamp when limit resets
}
```

### Error Types

#### `RateLimitError`

Thrown when rate limit configuration is invalid.

### Configuration

Rate limiting requires Redis configuration in environment variables:

```env
NEUROAGENT_RATE_LIMITER__REDIS_HOST=localhost
NEUROAGENT_RATE_LIMITER__REDIS_PORT=6379
NEUROAGENT_RATE_LIMITER__REDIS_PASSWORD=optional-password
NEUROAGENT_RATE_LIMITER__REDIS_SSL=false
NEUROAGENT_RATE_LIMITER__DISABLED=false

# Route-specific limits
NEUROAGENT_RATE_LIMITER__LIMIT_CHAT=20
NEUROAGENT_RATE_LIMITER__EXPIRY_CHAT=86400
NEUROAGENT_RATE_LIMITER__LIMIT_SUGGESTIONS_OUTSIDE=100
NEUROAGENT_RATE_LIMITER__LIMIT_SUGGESTIONS_INSIDE=500
NEUROAGENT_RATE_LIMITER__EXPIRY_SUGGESTIONS=86400
NEUROAGENT_RATE_LIMITER__LIMIT_TITLE=10
NEUROAGENT_RATE_LIMITER__EXPIRY_TITLE=86400
```

### Redis Key Format

Rate limit counters are stored in Redis with the following key format:
```
rate-limit:{userId}:{route}
```

Examples:
- `rate-limit:user-123:chat`
- `rate-limit:user-456:suggestions`
- `rate-limit:user-789:title`

### Behavior

1. **First Request**: Creates counter with value 1 and sets expiration
2. **Subsequent Requests**: Increments counter until limit is reached
3. **Limit Exceeded**: Returns `limited: true` with 429 status code
4. **Window Reset**: Counter expires after configured time, allowing new requests
5. **Graceful Degradation**: If Redis is unavailable or disabled, allows unlimited access (fail open)

### Example: Protected API Route with Rate Limiting

```typescript
import { NextRequest } from 'next/server';
import { validateAuth } from '@/lib/middleware/auth';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { getSettings } from '@/lib/config/settings';

export async function POST(request: NextRequest) {
  const settings = getSettings();
  
  try {
    // Validate authentication
    const userInfo = await validateAuth(request);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      userInfo.sub,
      'chat',
      settings.rateLimiter.limitChat,
      settings.rateLimiter.expiryChat
    );
    
    if (rateLimitResult.limited) {
      return new Response('Rate limit exceeded. Please try again later.', {
        status: 429,
        headers: rateLimitResult.headers,
      });
    }
    
    // Process request...
    const result = await processRequest(request);
    
    // Return response with rate limit headers
    return Response.json(result, {
      headers: rateLimitResult.headers,
    });
    
  } catch (error) {
    // Handle errors...
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### Example: Different Limits for Different Contexts

```typescript
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { getSettings } from '@/lib/config/settings';

export async function POST(request: NextRequest) {
  const settings = getSettings();
  const userInfo = await validateAuth(request);
  const body = await request.json();
  
  // Determine rate limit based on context
  const limit = body.vlabId && body.projectId
    ? settings.rateLimiter.limitSuggestionsInside
    : settings.rateLimiter.limitSuggestionsOutside;
  
  const rateLimitResult = await checkRateLimit(
    userInfo.sub,
    'suggestions',
    limit,
    settings.rateLimiter.expirySuggestions
  );
  
  if (rateLimitResult.limited) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: rateLimitResult.headers,
    });
  }
  
  // Process request...
}
```

### Testing

Tests should cover:
- Rate limit enforcement (requests blocked after limit)
- Rate limit headers (correct values in responses)
- Rate limit reset (counter expires after window)
- Graceful degradation (works when Redis is unavailable)
- Different limits for different routes

Example test:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, resetRateLimit, closeRedisConnection } from '@/lib/middleware/rate-limit';

describe('Rate Limiting', () => {
  const userId = 'test-user-123';
  const route = 'test-route';
  const limit = 5;
  const expiry = 60;
  
  beforeEach(async () => {
    await resetRateLimit(userId, route);
  });
  
  afterEach(async () => {
    await closeRedisConnection();
  });
  
  it('should allow requests within limit', async () => {
    for (let i = 0; i < limit; i++) {
      const result = await checkRateLimit(userId, route, limit, expiry);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(limit - i - 1);
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
  });
});
```

## Testing

Tests are located in `tests/middleware/`.

Run all middleware tests:
```bash
npm test -- tests/middleware/
```

Run specific test files:
```bash
npm test -- tests/middleware/auth.test.ts
npm test -- tests/middleware/rate-limit.test.ts
```

The test suites cover:

**Authentication (`auth.test.ts`):**
- Virtual lab access validation
- Project access validation
- Combined validation scenarios
- Authentication with missing/invalid tokens
- Optional authentication
- Error handling

**Rate Limiting (`rate-limit.test.ts`):**
- Rate limit enforcement
- Rate limit headers
- Rate limit reset
- Graceful degradation
- Different limits for different routes
