# EntityCore Tools Authentication Issue

## Problem

EntityCore tools are failing with authentication error:
```
{"error_code":"NOT_AUTHENTICATED","message":"The authorization token is missing","details":null}
```

## Root Cause

The EntityCore API requires a JWT bearer token in the Authorization header. In the Python backend, this is handled by creating an `httpx_client` with the token already in the headers:

```python
# backend/src/neuroagent/app/dependencies.py
async def get_httpx_client(
    request: Request, token: Annotated[str, Depends(auth)]
) -> AsyncIterator[AsyncClient]:
    """Manage the httpx client for the request."""
    client = AsyncClient(
        timeout=300.0,
        verify=False,
        headers={
            "x-request-id": request.headers["x-request-id"],
            "Authorization": f"Bearer {token}",  # ← Token is here!
        },
    )
    try:
        yield client
    finally:
        await client.aclose()
```

Then this client is passed to tools via context variables:

```python
# backend/src/neuroagent/app/dependencies.py
async def get_context_variables(...) -> dict[str, Any]:
    return {
        "httpx_client": httpx_client,  # Already has Authorization header
        "entitycore_url": settings.tools.entitycore.url,
        # ...
    }
```

## Current TypeScript Implementation

The TypeScript tools expect `httpxClient` to already have the Authorization header:

```typescript
// backend-ts/src/lib/tools/entitycore/brain-region-getall.ts
async execute(input: InputType): Promise<ResponseType> {
  const { entitycoreUrl, vlabId, projectId, httpxClient } = this.contextVariables;

  // We add virtual-lab-id and project-id headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (vlabId) {
    headers['virtual-lab-id'] = vlabId;
  }
  if (projectId) {
    headers['project-id'] = projectId;
  }

  // httpxClient should already have Authorization header!
  const response = httpxClient
    ? await httpxClient.get(url, { headers })
    : await fetch(url, { headers });  // ← Fallback doesn't have token!
}
```

## Solution

The `httpxClient` passed to EntityCore tools **MUST** already have the Authorization header set. This needs to be configured where tools are instantiated.

### Where to Fix

The fix needs to be in the code that calls `createToolInstance()` and passes the `ToolConfig`. The `httpxClient` in the config must be created with the Authorization header.

**Example of what needs to happen:**

```typescript
// Somewhere in the API route or agent routine
const token = await getAuthToken(request);

// Create httpx client with Authorization header
const httpxClient = createHttpClient({
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-request-id': request.headers.get('x-request-id'),
  },
});

// Pass to tool config
const toolConfig: ToolConfig = {
  httpxClient,  // ← Must have Authorization header!
  entitycoreUrl: settings.entitycoreUrl,
  entityFrontendUrl: settings.entityFrontendUrl,
  vlabId: thread.vlabId,
  projectId: thread.projectId,
};

// Create tool instance
const tool = await createToolInstance(ToolClass, toolConfig);
```

### Alternative: Pass Token Separately

If creating an httpx client with headers is complex, an alternative is to pass the token separately in context variables:

```typescript
// Option 1: Add token to EntitycoreContextVariables
export interface EntitycoreContextVariables extends BaseContextVariables {
  httpxClient: any;
  entitycoreUrl: string;
  entityFrontendUrl: string;
  vlabId?: string;
  projectId?: string;
  authToken?: string;  // ← Add this
}

// Option 2: Update tool to use token
async execute(input: InputType): Promise<ResponseType> {
  const { entitycoreUrl, vlabId, projectId, httpxClient, authToken } = this.contextVariables;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (vlabId) {
    headers['virtual-lab-id'] = vlabId;
  }
  if (projectId) {
    headers['project-id'] = projectId;
  }

  // Now headers include Authorization
  const response = httpxClient
    ? await httpxClient.get(url, { headers })
    : await fetch(url, { headers });
}
```

## Action Items

1. **Find where `createToolInstance()` is called** in the agent routine or API routes
2. **Ensure `httpxClient` has Authorization header** before passing to tools
3. **OR add `authToken` to context variables** and update tools to use it
4. **Test with actual API call** to verify authentication works

## Files to Check

- `backend-ts/src/lib/agents/routine.ts` - Where tools are executed
- `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts` - API route that handles chat
- Any middleware or dependency injection that creates context variables

## Python Reference

See how Python does it:
- `backend/src/neuroagent/app/dependencies.py` - `get_httpx_client()` and `get_context_variables()`
- `backend/src/neuroagent/tools/entitycore_brainregion_getall.py` - How tools use the client

## Status

🔴 **BLOCKED** - EntityCore tools cannot be used until authentication is properly configured.

The tools themselves are correctly implemented and tested. The issue is in the infrastructure/configuration layer that provides context variables to tools.
