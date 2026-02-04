# Python to TypeScript Backend Migration Guide

## Overview

This guide documents the complete migration of the Neuroagent backend from Python/FastAPI to TypeScript/Next.js with native Vercel AI SDK integration. The migration maintains full API compatibility while leveraging TypeScript's type safety and the Vercel AI SDK's optimized streaming capabilities.

## Table of Contents

1. [Architecture Changes](#architecture-changes)
2. [Technology Stack Mapping](#technology-stack-mapping)
3. [Code Pattern Translations](#code-pattern-translations)
4. [Database Migration](#database-migration)
5. [Tool System Migration](#tool-system-migration)
6. [Agent Routine Migration](#agent-routine-migration)
7. [API Routes Migration](#api-routes-migration)
8. [Configuration Migration](#configuration-migration)
9. [Testing Migration](#testing-migration)
10. [Deployment Changes](#deployment-changes)

---

## Architecture Changes

### High-Level Architecture Comparison

**Python Backend (FastAPI):**
```
Frontend → FastAPI → OpenAI Python Client → LLM
                  ↓
              SQLAlchemy → PostgreSQL
```

**TypeScript Backend (Next.js):**
```
Frontend → Next.js API Routes → Vercel AI SDK → LLM
                              ↓
                          Prisma → PostgreSQL
```

### Key Architectural Differences

1. **Framework**: FastAPI → Next.js 15+ App Router
2. **LLM Integration**: OpenAI Python Client → Vercel AI SDK v4.3.19
3. **ORM**: SQLAlchemy → Prisma
4. **Validation**: Pydantic v2 → Zod
5. **Streaming**: FastAPI StreamingResponse → Vercel AI SDK Data Streams
6. **Migrations**: Alembic → Prisma Migrate

---

## Technology Stack Mapping

### Core Dependencies

| Python | TypeScript | Purpose |
|--------|-----------|---------|
| `fastapi` | `next` | Web framework |
| `pydantic` | `zod` | Schema validation |
| `sqlalchemy` | `@prisma/client` | Database ORM |
| `alembic` | `prisma` (CLI) | Database migrations |
| `openai` | `ai` + `@ai-sdk/openai` | LLM integration |
| `uvicorn` | Built into Next.js | Server runtime |
| `pytest` | `vitest` | Testing framework |
| `mypy` | `typescript` | Type checking |
| `ruff` | `eslint` + `prettier` | Linting/formatting |

### Additional TypeScript Dependencies

- `@openrouter/ai-sdk-provider` - OpenRouter integration
- `@aws-sdk/client-s3` - S3/MinIO storage
- `ioredis` - Redis client for rate limiting
- `jose` - JWT token verification
- `@fast-check/vitest` - Property-based testing

---

## Code Pattern Translations

### 1. Async Functions

**Python:**
```python
async def get_thread(thread_id: str) -> Thread:
    async with get_session() as session:
        result = await session.execute(
            select(Thread).where(Thread.id == thread_id)
        )
        return result.scalar_one_or_none()
```

**TypeScript:**
```typescript
async function getThread(threadId: string): Promise<Thread | null> {
  return await prisma.thread.findUnique({
    where: { id: threadId },
  });
}
```

### 2. Schema Validation

**Python (Pydantic):**
```python
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    model: str | None = None
```

**TypeScript (Zod):**
```typescript
import { z } from 'zod';

const ChatRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  model: z.string().optional(),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;
```

### 3. API Route Handlers

**Python (FastAPI):**
```python
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()

@router.post("/api/threads")
async def create_thread(
    request: CreateThreadRequest,
    user: UserInfo = Depends(get_current_user),
) -> Thread:
    # Implementation
    return thread
```

**TypeScript (Next.js):**
```typescript
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const user = await validateAuth(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const validated = CreateThreadSchema.parse(body);

  // Implementation
  return Response.json(thread);
}
```

### 4. Database Models

**Python (SQLAlchemy):**
```python
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class Thread(Base):
    __tablename__ = "threads"

    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    title = Column(String, nullable=False, default="New chat")
    user_id = Column(UUID, nullable=False)
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")
```

**TypeScript (Prisma):**
```prisma
model Thread {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title     String    @default("New chat")
  userId    String    @map("user_id") @db.Uuid
  messages  Message[]

  @@map("threads")
}
```

### 5. LLM Streaming

**Python (OpenAI Client):**
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=settings.openai_token)

async def stream_chat():
    stream = await client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

**TypeScript (Vercel AI SDK):**
```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function streamChat() {
  const result = streamText({
    model: openai('gpt-4'),
    messages: messages,
  });

  return result.toDataStreamResponse();
}
```

### 6. Tool Definitions

**Python:**
```python
from neuroagent.tools.base_tool import BaseTool
from pydantic import BaseModel, Field

class WebSearchInput(BaseModel):
    query: str = Field(..., description="Search query")
    max_results: int = Field(10, description="Maximum results")

class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Search the web"
    input_schema = WebSearchInput

    async def execute(self, input: WebSearchInput) -> dict:
        # Implementation
        return {"results": []}
```

**TypeScript:**
```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

export class WebSearchTool extends BaseTool<typeof WebSearchInputSchema> {
  metadata = {
    name: 'web_search',
    description: 'Search the web',
  };

  inputSchema = z.object({
    query: z.string().describe('Search query'),
    maxResults: z.number().default(10).describe('Maximum results'),
  });

  async execute(input: z.infer<typeof this.inputSchema>) {
    // Implementation
    return { results: [] };
  }
}

const WebSearchInputSchema = z.object({
  query: z.string().describe('Search query'),
  maxResults: z.number().default(10).describe('Maximum results'),
});
```

### 7. Error Handling

**Python:**
```python
from fastapi import HTTPException

try:
    result = await some_operation()
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

**TypeScript:**
```typescript
import { z } from 'zod';

try {
  const result = await someOperation();
} catch (error) {
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: 'Validation Error', details: error.errors },
      { status: 400 }
    );
  }

  console.error('Unexpected error:', error);
  return Response.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
```

### 8. Dependency Injection

**Python (FastAPI Dependencies):**
```python
from fastapi import Depends

async def get_db_session():
    async with AsyncSession() as session:
        yield session

@router.get("/threads")
async def list_threads(
    session: AsyncSession = Depends(get_db_session),
    user: UserInfo = Depends(get_current_user),
):
    # Use session and user
    pass
```

**TypeScript (Direct Imports):**
```typescript
import { prisma } from '@/lib/db/client';
import { validateAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const user = await validateAuth(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Use prisma directly (singleton)
  const threads = await prisma.thread.findMany({
    where: { userId: user.sub },
  });

  return Response.json(threads);
}
```

---

## Database Migration

### Schema Translation

The database schema remains largely the same, but with Prisma syntax:

**Key Differences:**

1. **Column Naming**: Prisma uses camelCase in TypeScript, snake_case in database
   - Use `@map("snake_case_name")` for field mapping
   - Use `@@map("table_name")` for table mapping

2. **Relations**: Prisma requires explicit relation fields on both sides
   ```prisma
   model Thread {
     messages Message[]
   }

   model Message {
     thread   Thread @relation(fields: [threadId], references: [id])
     threadId String @map("thread_id") @db.Uuid
   }
   ```

3. **Enums**: Defined at schema level, not in models
   ```prisma
   enum Entity {
     USER
     AI_TOOL
     TOOL
     AI_MESSAGE
   }
   ```

4. **Full-Text Search**: Use `Unsupported("tsvector")` for PostgreSQL-specific types
   ```prisma
   searchVector Unsupported("tsvector")? @map("search_vector")
   @@index([searchVector], type: Gin)
   ```

### Migration Workflow

**Python (Alembic):**
```bash
# Create migration
alembic revision --autogenerate -m "add_user_preferences"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

**TypeScript (Prisma):**
```bash
# Create and apply migration
npm run db:migrate
# Enter migration name when prompted

# Apply migrations (production)
npm run db:migrate:deploy

# Rollback (manual - edit migration files)
# Prisma doesn't have automatic rollback
```

---

## Tool System Migration

### Base Tool Class

The tool system maintains the same conceptual structure but uses TypeScript patterns:

**Key Changes:**

1. **Metadata**: Class properties instead of class variables
2. **Schema**: Zod instead of Pydantic
3. **Vercel AI SDK Integration**: `toVercelTool()` method for SDK compatibility
4. **Type Safety**: Generic type parameter for input schema

**Migration Steps:**

1. Convert Pydantic input schema to Zod schema
2. Update metadata to object literal
3. Implement `toVercelTool()` method
4. Update execute method signature
5. Add proper TypeScript types

**Example Migration:**

```python
# Python
class MyTool(BaseTool):
    name = "my_tool"
    description = "Does something"
    input_schema = MyToolInput
```

```typescript
// TypeScript
export class MyTool extends BaseTool<typeof MyToolInputSchema> {
  metadata = {
    name: 'my_tool',
    description: 'Does something',
  };

  inputSchema = MyToolInputSchema;
}
```

---

## Agent Routine Migration

### Core Differences

**Python Approach:**
- Manual streaming loop
- Custom tool execution
- Manual message history management
- Custom token counting

**TypeScript Approach (Vercel AI SDK):**
- SDK handles streaming automatically
- SDK manages tool execution loop
- SDK converts message formats
- SDK tracks token usage

### Migration Example

**Python:**
```python
async def stream_agent_response(messages, tools):
    while turn < max_turns:
        # Create completion
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tool_definitions,
            stream=True,
        )

        # Handle streaming
        async for chunk in response:
            # Process chunk
            yield chunk

        # Check for tool calls
        if tool_calls:
            # Execute tools
            for tool_call in tool_calls:
                result = await execute_tool(tool_call)
                messages.append(tool_result_message)
        else:
            break
```

**TypeScript:**
```typescript
async function streamAgentResponse(messages: CoreMessage[], tools: Record<string, CoreTool>) {
  const result = streamText({
    model: openai('gpt-4'),
    messages: messages,
    tools: tools,
    maxSteps: maxTurns, // SDK handles multi-turn loop
    onFinish: async ({ usage, response }) => {
      // Save to database
      await saveMessage(response, usage);
    },
  });

  return result.toDataStreamResponse();
}
```

**Key Benefits:**
- Less code to maintain
- Automatic tool execution loop
- Built-in error handling
- Optimized streaming performance
- Automatic token tracking

---

## API Routes Migration

### Route Structure

**Python (FastAPI):**
```
backend/src/neuroagent/app/routers/
├── qa.py          # Chat endpoints
├── threads.py     # Thread management
├── tools.py       # Tool listing
└── storage.py     # File storage
```

**TypeScript (Next.js):**
```
backend-ts/src/app/api/
├── qa/
│   ├── chat_streamed/[thread_id]/route.ts
│   ├── question_suggestions/route.ts
│   └── models/route.ts
├── threads/
│   ├── route.ts
│   └── [thread_id]/route.ts
├── tools/route.ts
└── storage/[file_identifier]/presigned-url/route.ts
```

### Endpoint Mapping

| Python Endpoint | TypeScript Endpoint | Method | Purpose |
|----------------|---------------------|--------|---------|
| `/qa/chat_streamed/{thread_id}` | `/api/qa/chat_streamed/[thread_id]` | POST | Stream chat response |
| `/qa/question_suggestions` | `/api/qa/question_suggestions` | POST | Generate suggestions |
| `/qa/models` | `/api/qa/models` | GET | List available models |
| `/threads` | `/api/threads` | GET, POST | List/create threads |
| `/threads/{thread_id}` | `/api/threads/[thread_id]` | GET, PATCH, DELETE | Thread operations |
| `/threads/search` | `/api/threads/search` | GET | Search threads |
| `/tools` | `/api/tools` | GET | List tools |
| `/storage/{file_id}/presigned-url` | `/api/storage/[file_identifier]/presigned-url` | GET | Get presigned URL |

### Request/Response Compatibility

All endpoints maintain the same request/response schemas for frontend compatibility:

- Same JSON structure
- Same HTTP status codes
- Same error response format
- Same streaming format (Vercel AI SDK compatible)

---

## Configuration Migration

### Environment Variables

**Python (Nested with `__`):**
```bash
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4
NEUROAGENT_DB__HOST=localhost
NEUROAGENT_DB__PORT=5432
```

**TypeScript (Same format):**
```bash
# Same environment variable names
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4
NEUROAGENT_DB__HOST=localhost
NEUROAGENT_DB__PORT=5432

# Plus Prisma-specific
DATABASE_URL=postgresql://user:pass@localhost:5432/neuroagent
```

### Configuration Loading

**Python (Pydantic Settings):**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    class Config:
        env_prefix = "NEUROAGENT_"
        env_nested_delimiter = "__"
```

**TypeScript (Zod + Manual Parsing):**
```typescript
import { z } from 'zod';

const SettingsSchema = z.object({
  llm: z.object({
    openaiToken: z.string().optional(),
    defaultChatModel: z.string(),
  }),
  db: z.object({
    host: z.string(),
    port: z.number(),
  }),
});

// Manual parsing of nested env vars
function parseEnvVars() {
  return {
    llm: {
      openaiToken: process.env.NEUROAGENT_LLM__OPENAI_TOKEN,
      defaultChatModel: process.env.NEUROAGENT_LLM__DEFAULT_CHAT_MODEL,
    },
    // ...
  };
}
```

---

## Testing Migration

### Test Framework

**Python → TypeScript:**
- `pytest` → `vitest`
- `pytest-asyncio` → Native async support in Vitest
- `pytest-cov` → `@vitest/coverage-v8`
- Property testing: Custom → `@fast-check/vitest`

### Test Structure

**Python:**
```python
import pytest

@pytest.mark.asyncio
async def test_create_thread():
    # Test implementation
    assert result.id is not None
```

**TypeScript:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Thread Creation', () => {
  it('should create a thread', async () => {
    // Test implementation
    expect(result.id).toBeDefined();
  });
});
```

### Property-Based Testing

**TypeScript (fast-check):**
```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.string(), fc.integer({ min: 1, max: 100 })])(
  'should validate tool inputs',
  async (query, maxResults) => {
    const result = await tool.inputSchema.parseAsync({
      query,
      maxResults,
    });

    expect(result.query).toBe(query);
  }
);
```

---

## Deployment Changes

### Docker

**Python Dockerfile:**
```dockerfile
FROM python:3.11
COPY requirements.txt .
RUN pip install -r requirements.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**TypeScript Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
COPY --from=builder /app/.next/standalone ./
CMD ["node", "server.js"]
```

### Port Changes

- Python backend: Port 8078
- TypeScript backend: Port 8079 (development), configurable in production

### Environment Setup

Both backends require:
- PostgreSQL database
- Redis (for rate limiting)
- MinIO/S3 (for storage)
- Keycloak (for authentication)

---

## Common Migration Patterns

### 1. Converting Pydantic Models to Zod Schemas

```python
# Python
class User(BaseModel):
    id: UUID
    email: EmailStr
    age: int = Field(ge=0, le=150)
    tags: list[str] = []
```

```typescript
// TypeScript
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  tags: z.array(z.string()).default([]),
});

type User = z.infer<typeof UserSchema>;
```

### 2. Converting SQLAlchemy Queries to Prisma

```python
# Python
result = await session.execute(
    select(Thread)
    .where(Thread.user_id == user_id)
    .order_by(Thread.creation_date.desc())
    .limit(10)
)
threads = result.scalars().all()
```

```typescript
// TypeScript
const threads = await prisma.thread.findMany({
  where: { userId: userId },
  orderBy: { creationDate: 'desc' },
  take: 10,
});
```

### 3. Converting FastAPI Dependencies to Next.js Middleware

```python
# Python
async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> UserInfo:
    # Validate token
    return user_info

@router.get("/protected")
async def protected_route(user: UserInfo = Depends(get_current_user)):
    # Use user
    pass
```

```typescript
// TypeScript
async function validateAuth(request: NextRequest): Promise<UserInfo | null> {
  // Validate token
  return userInfo;
}

export async function GET(request: NextRequest) {
  const user = await validateAuth(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Use user
}
```

---

## Troubleshooting Common Migration Issues

### 1. Type Errors with Prisma

**Issue**: TypeScript complains about Prisma types

**Solution**: Regenerate Prisma client after schema changes
```bash
npm run db:generate
```

### 2. Streaming Not Working

**Issue**: Streaming responses not appearing in frontend

**Solution**: Ensure proper headers and use Vercel AI SDK's `toDataStreamResponse()`
```typescript
return result.toDataStreamResponse();
```

### 3. Environment Variables Not Loading

**Issue**: Configuration values are undefined

**Solution**: Check environment variable names match exactly (including `NEUROAGENT_` prefix and `__` delimiters)

### 4. Database Connection Errors

**Issue**: Cannot connect to PostgreSQL

**Solution**: Verify `DATABASE_URL` format:
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

### 5. Tool Execution Failures

**Issue**: Tools not being called by LLM

**Solution**: Ensure tool schemas are properly converted to Vercel AI SDK format using `toVercelTool()`

---

## Performance Considerations

### Improvements in TypeScript Backend

1. **Streaming Performance**: Vercel AI SDK provides optimized streaming
2. **Connection Pooling**: Prisma handles connection pooling automatically
3. **Type Safety**: Compile-time type checking prevents runtime errors
4. **Bundle Size**: Next.js optimizes bundle size automatically

### Monitoring

Both backends support:
- Token consumption tracking
- Request logging
- Error tracking
- Performance metrics

---

## Next Steps After Migration

1. **Testing**: Run comprehensive test suite
2. **Performance Testing**: Compare response times with Python backend
3. **Load Testing**: Verify scalability
4. **Documentation**: Update API documentation
5. **Deployment**: Deploy to staging environment
6. **Monitoring**: Set up monitoring and alerting
7. **Gradual Rollout**: Migrate traffic gradually from Python to TypeScript

---

## Additional Resources

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## Support

For migration questions or issues:
- Check `backend-ts/docs/` for detailed documentation
- Review `backend-ts/README.md` for setup instructions
- See `prisma/MIGRATION_GUIDE.md` for database-specific guidance
