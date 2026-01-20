# Middleware Flow Documentation

## Overview

This document describes the middleware flow in the TypeScript backend. The middleware chain processes all incoming requests in a specific order to ensure proper handling of CORS, request correlation, and path normalization.

## Middleware Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming Request                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Path Prefix Stripping                              │
│  - Check if application prefix is configured                │
│  - Strip prefix from request path if present                │
│  - Preserve query params, headers, and method               │
│  - Skip Next.js internal routes (_next/*)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: CORS Preflight Check                               │
│  - Check if request is OPTIONS with CORS headers            │
│  - If yes: Return 204 with CORS headers immediately         │
│  - If no: Continue to next step                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Continue Request Processing                        │
│  - Create NextResponse to continue the request              │
│  - Request proceeds to route handlers                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Add Request ID                                     │
│  - Check if request already has X-Request-ID header         │
│  - If yes: Preserve existing ID                             │
│  - If no: Generate new UUID v4                              │
│  - Add X-Request-ID header to response                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Add CORS Headers (API routes only)                 │
│  - Check if path starts with /api                           │
│  - If yes: Add CORS headers to response                     │
│  - If no: Skip CORS headers                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Return Response                           │
└─────────────────────────────────────────────────────────────┘
```

## Middleware Components

### 1. Path Prefix Stripping

**File**: `src/lib/middleware/path-prefix.ts`

**Purpose**: Normalize request paths by removing configured application prefix

**Configuration**: `NEUROAGENT_MISC__APPLICATION_PREFIX`

**Example**:
```
Input:  /myapp/api/threads/123
Output: /api/threads/123
```

**Key Features**:
- Preserves query parameters
- Preserves request headers
- Preserves HTTP method
- Skips Next.js internal routes
- Only strips if prefix is configured

### 2. CORS Handling

**File**: `src/lib/middleware/cors.ts`

**Purpose**: Handle Cross-Origin Resource Sharing for API routes

**Configuration**: `NEUROAGENT_MISC__CORS_ORIGINS`

**Headers Added**:
- `Access-Control-Allow-Origin`: Configured origins or `*`
- `Access-Control-Allow-Credentials`: `true`
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS, PATCH`
- `Access-Control-Allow-Headers`: Authorization, Content-Type, etc.
- `Access-Control-Max-Age`: `86400` (24 hours)

**Preflight Handling**:
- Detects OPTIONS requests with CORS headers
- Returns 204 No Content immediately
- Includes all CORS headers in response

### 3. Request ID Correlation

**File**: `src/lib/middleware/request-id.ts`

**Purpose**: Add unique request IDs for tracing and debugging

**Header**: `X-Request-ID`

**Key Features**:
- Generates UUID v4 using Web Crypto API
- Preserves existing request IDs
- Adds to all responses
- Enables request correlation across logs

## Configuration

### Environment Variables

```env
# CORS Origins (comma-separated)
NEUROAGENT_MISC__CORS_ORIGINS=http://localhost:3000,http://example.com

# Application Prefix (optional)
NEUROAGENT_MISC__APPLICATION_PREFIX=/myapp
```

### Middleware Matcher

The middleware runs on all routes except:
- `/_next/static/*` - Next.js static files
- `/_next/image/*` - Next.js image optimization
- `/favicon.ico` - Favicon file

## Testing

All middleware components have comprehensive test coverage:

- **CORS Tests**: 11 tests covering preflight, headers, origins
- **Request ID Tests**: 13 tests covering generation, preservation, headers
- **Path Prefix Tests**: 18 tests covering stripping, preservation, edge cases
- **Integration Tests**: 12 tests covering complete middleware chain

Run tests:
```bash
npm test tests/middleware --run
```

## Debugging

### Request ID Tracing

All requests include an `X-Request-ID` header in the response. Use this ID to:
- Trace requests through logs
- Correlate related operations
- Debug issues across services

### CORS Issues

If experiencing CORS issues:
1. Check `NEUROAGENT_MISC__CORS_ORIGINS` configuration
2. Verify origin is in allowed list
3. Check browser console for CORS errors
4. Verify preflight requests return 204

### Path Prefix Issues

If routes are not found:
1. Check `NEUROAGENT_MISC__APPLICATION_PREFIX` configuration
2. Verify prefix matches deployment configuration
3. Check that prefix is being stripped correctly
4. Verify Next.js internal routes are not affected

## Performance Considerations

- **Path Prefix Stripping**: Minimal overhead, only creates new request if prefix present
- **CORS Preflight**: Early return avoids unnecessary processing
- **Request ID**: UUID generation is fast using Web Crypto API
- **CORS Headers**: Only added to API routes to minimize overhead

## Security Considerations

- **CORS Origins**: Configure specific origins in production, avoid wildcard (`*`)
- **Request ID**: Uses cryptographically secure UUID generation
- **Path Prefix**: Validates prefix before stripping to prevent path traversal
- **Headers**: All headers are validated and sanitized

## Next.js Configuration

Additional CORS headers are configured in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        // ... other headers
      ],
    },
  ];
}
```

These static headers complement the dynamic middleware headers.
