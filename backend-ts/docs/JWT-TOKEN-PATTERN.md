# JWT Token Authentication Pattern

## Overview

This document explains how JWT tokens are passed to tools in the TypeScript backend, matching the Python implementation's pattern.

## Python Pattern (Reference)

In the Python backend (`backend/src/neuroagent/app/dependencies.py`), JWT tokens are handled as follows:

```python
async def get_httpx_client(
    request: Request, token: Annotated[str, Depends(auth)]
) -> AsyncIterator[AsyncClient]:
    """Manage the httpx client for the request."""
    client = AsyncClient(
        timeout=300.0,
        verify=False,
        headers={
            "x-request-id": request.headers["x-request-id"],
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        yield client
    finally:
        await client.aclose()
```

The `httpx_client` is then passed to tools via context variables (metadata), automatically including the JWT token in all requests.

## TypeScript Solution

### 1. Use `ky` Library

We use [`ky`](https://github.com/sindresorhus/ky) as the HTTP client library. It's the TypeScript equivalent of Python's `httpx`:

- Modern, lightweight fetch wrapper
- Built on native `fetch` API
- Excellent TypeScript support
- Automatic JSON parsing
- Configurable timeouts and retries
- Hook system for request/response interception

**Installation:**
```bash
npm install ky
```

### 2. Create Authenticated Client in API Route

In your Next.js API route handler, extract the JWT token from the request and create a ky instance:

```typescript
import ky from 'ky';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  // Extract JWT token from Authorization header
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // Extract request ID for correlation
  const requestId = headersList.get('x-request-id');

  // Create authenticated HTTP client
  const httpxClient = ky.create({
    timeout: 300000, // 5 minutes (matches Python)
    retry: 0,
    hooks: {
      beforeRequest: [
        (request) => {
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
          if (requestId) {
            request.headers.set('x-request-id', requestId);
          }
        },
      ],
    },
  });

  // Pass httpxClient to context variables
  const contextVariables: EntitycoreContextVariables = {
    httpxClient,
    entitycoreUrl: process.env.ENTITYCORE_URL!,
    vlabId: thread.vlab_id,
    projectId: thread.project_id,
    entityFrontendUrl: process.env.ENTITY_FRONTEND_URL!,
  };

  // Instantiate and use tools
  const tool = new BrainRegionGetAllTool(contextVariables);
  const result = await tool.execute(input);
}
```

### 3. Tool Implementation

Tools receive the pre-configured `httpxClient` (ky instance) via context variables:

```typescript
import { type KyInstance } from 'ky';

export interface EntitycoreContextVariables extends BaseContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpxClient: KyInstance;
  entitycoreUrl: string;
  vlabId?: string;
  projectId?: string;
  entityFrontendUrl: string;
}

export class BrainRegionGetAllTool extends BaseTool<
  typeof BrainRegionGetAllInputSchema,
  EntitycoreContextVariables
> {
  async execute(input: z.infer<typeof BrainRegionGetAllInputSchema>) {
    const { entitycoreUrl, vlabId, projectId, httpxClient } = this.contextVariables;

    // Prepare query parameters
    const searchParams: Record<string, string | string[]> = {};
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams[key] = Array.isArray(value) ? value.map(String) : String(value);
      }
    });

    // Prepare additional headers (JWT is already in httpxClient)
    const headers: Record<string, string> = {};
    if (vlabId) {
      headers['virtual-lab-id'] = vlabId;
    }
    if (projectId) {
      headers['project-id'] = projectId;
    }

    // Make request - JWT token is automatically included
    const data = await httpxClient
      .get(`${entitycoreUrl}/brain-region`, {
        searchParams,
        headers,
      })
      .json();

    return zListResponseBrainRegionRead.parse(data);
  }
}
```

## Key Benefits

1. **No Wrapper Needed**: Use `ky` directly - it's already a clean, modern API
2. **Automatic Token Injection**: JWT token is automatically included in all requests via hooks
3. **Type Safety**: Full TypeScript support with type inference
4. **Matches Python Pattern**: Same conceptual flow as Python's `httpx_client`
5. **Clean Tool Code**: Tools don't need to worry about authentication - it's handled at the client level

## Ky Usage Examples

### Basic GET Request
```typescript
const data = await httpxClient.get('https://api.example.com/data').json();
```

### GET with Query Parameters
```typescript
const data = await httpxClient.get('https://api.example.com/data', {
  searchParams: { page: 1, limit: 10 }
}).json();
```

### POST with JSON Body
```typescript
const result = await httpxClient.post('https://api.example.com/data', {
  json: { name: 'value' }
}).json();
```

### Custom Headers
```typescript
const data = await httpxClient.get('https://api.example.com/data', {
  headers: { 'Custom-Header': 'value' }
}).json();
```

### Error Handling
```typescript
try {
  const data = await httpxClient.get('https://api.example.com/data').json();
} catch (error) {
  // ky throws HTTPError for non-2xx responses
  if (error instanceof HTTPError) {
    console.error('Status:', error.response.status);
    console.error('Body:', await error.response.text());
  }
}
```

## Migration Checklist

When translating a Python tool that uses `httpx_client`:

- [ ] Import `KyInstance` type from `ky`
- [ ] Update context variables interface to use `httpxClient: KyInstance`
- [ ] Replace `httpx_client.get(url, params=..., headers=...)` with `httpxClient.get(url, { searchParams: ..., headers: ... }).json()`
- [ ] Remove manual response status checking - ky throws on non-2xx
- [ ] Remove manual JSON parsing - use `.json()` method
- [ ] Update health check methods to use ky

## References

- [ky Documentation](https://github.com/sindresorhus/ky)
- [Python httpx Documentation](https://www.python-httpx.org/)
- [Backend Python dependencies.py](../../../backend/src/neuroagent/app/dependencies.py)
