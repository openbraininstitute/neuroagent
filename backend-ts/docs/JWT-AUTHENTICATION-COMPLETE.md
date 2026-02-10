# JWT Authentication Implementation - Complete

## Status: ✅ IMPLEMENTED

The JWT token authentication pattern has been successfully implemented in the TypeScript backend, matching the Python implementation.

## Implementation Summary

### 1. HTTP Client Library
- **Library**: `ky` (installed via `npm install ky`)
- **Why**: Modern, TypeScript-first HTTP client (equivalent to Python's `httpx`)
- **Location**: Used directly, no wrapper needed

### 2. API Route Integration
**File**: `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts`

```typescript
import ky from 'ky';

// Extract JWT token from request
const { jwtToken } = await validateAuth(request);

// Create authenticated HTTP client (matches Python's httpx_client)
const httpxClient = ky.create({
  timeout: 300000, // 5 minutes
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        if (jwtToken) {
          request.headers.set('Authorization', `Bearer ${jwtToken}`);
        }
        const requestId = headers.get('x-request-id');
        if (requestId) {
          request.headers.set('x-request-id', requestId);
        }
      },
    ],
  },
});

// Pass to agent config
const agentConfig = {
  // ... other config
  contextVariables: {
    httpxClient, // ← Authenticated ky instance
    entitycoreUrl: settings.tools.entitycore.url,
    entityFrontendUrl: settings.tools.frontendBaseUrl,
    vlabId: thread.vlabId,
    projectId: thread.projectId,
    // ... other context
  },
};
```

### 3. Context Variables Interface
**File**: `backend-ts/src/lib/tools/base-tool.ts`

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
```

### 4. Tool Implementation
**Files**:
- `backend-ts/src/lib/tools/entitycore/brain-region-getall.ts`
- `backend-ts/src/lib/tools/entitycore/brain-region-getone.ts`

```typescript
export class BrainRegionGetAllTool extends BaseTool<
  typeof BrainRegionGetAllInputSchema,
  EntitycoreContextVariables
> {
  async execute(input: z.infer<typeof BrainRegionGetAllInputSchema>) {
    const { entitycoreUrl, vlabId, projectId, httpxClient } = this.contextVariables;

    // Prepare headers (JWT is already in httpxClient)
    const headers: Record<string, string> = {};
    if (vlabId) headers['virtual-lab-id'] = vlabId;
    if (projectId) headers['project-id'] = projectId;

    // Make request - JWT token automatically included
    const data = await httpxClient
      .get(`${entitycoreUrl}/brain-region`, {
        searchParams: input,
        headers,
      })
      .json();

    return zListResponseBrainRegionRead.parse(data);
  }
}
```

## How It Works

### Request Flow
```
1. Client Request → API Route
   ↓
2. Extract JWT token from Authorization header
   ↓
3. Create ky instance with JWT in beforeRequest hook
   ↓
4. Pass ky instance to agent via contextVariables
   ↓
5. Agent passes contextVariables to tools
   ↓
6. Tools use httpxClient for API calls
   ↓
7. JWT token automatically included in all requests
```

### Python vs TypeScript Comparison

**Python** (`backend/src/neuroagent/app/dependencies.py`):
```python
async def get_httpx_client(request: Request, token: str):
    client = AsyncClient(
        timeout=300.0,
        headers={
            "Authorization": f"Bearer {token}",
            "x-request-id": request.headers["x-request-id"],
        },
    )
    yield client
```

**TypeScript** (`backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts`):
```typescript
const httpxClient = ky.create({
  timeout: 300000,
  hooks: {
    beforeRequest: [(request) => {
      request.headers.set('Authorization', `Bearer ${jwtToken}`);
      request.headers.set('x-request-id', requestId);
    }],
  },
});
```

## Benefits

1. **Clean Separation**: Authentication logic is centralized in the API route
2. **Type Safety**: Full TypeScript support with `KyInstance` type
3. **Automatic Injection**: JWT token automatically included in all tool requests
4. **Matches Python**: Same conceptual pattern as Python's `httpx_client`
5. **No Wrapper Needed**: Use ky directly - it's already a clean API

## Testing

Tools can be tested by providing a mock ky instance:

```typescript
const mockHttpxClient = {
  get: vi.fn().mockResolvedValue({
    json: () => Promise.resolve(mockData),
  }),
} as any;

const contextVariables: EntitycoreContextVariables = {
  httpxClient: mockHttpxClient,
  entitycoreUrl: 'https://api.example.com',
  // ... other context
};

const tool = new BrainRegionGetAllTool(contextVariables);
```

## Next Steps

- ✅ JWT authentication implemented
- ✅ Brain region tools updated
- ⏭️ Apply same pattern to other EntityCore tools
- ⏭️ Apply same pattern to OBIOne tools
- ⏭️ Update tool tests to use mock ky instances

## References

- [JWT-TOKEN-PATTERN.md](./JWT-TOKEN-PATTERN.md) - Detailed usage guide
- [ky Documentation](https://github.com/sindresorhus/ky)
- [Python dependencies.py](../../../backend/src/neuroagent/app/dependencies.py)
