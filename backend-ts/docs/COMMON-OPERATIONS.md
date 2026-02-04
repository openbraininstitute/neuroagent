# Common Operations Guide

Practical examples for common development and operational tasks.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Database Operations](#database-operations)
3. [API Testing](#api-testing)
4. [Tool Development](#tool-development)
5. [Debugging](#debugging)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Monitoring](#monitoring)

---

## Development Setup

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd neuroagent/backend-ts

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Generate Prisma client
npm run db:generate

# 5. Run migrations
npm run db:migrate

# 6. Start development server
npm run dev
```

### Daily Development Workflow

```bash
# Pull latest changes
git pull

# Install new dependencies (if package.json changed)
npm install

# Run migrations (if schema changed)
npm run db:migrate

# Start dev server
npm run dev

# In another terminal: run tests in watch mode
npm run test:watch
```

### Environment Setup for Different Scenarios

**Local Development (No Docker):**
```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neuroagent"
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_RATE_LIMITER__DISABLED=true
NEUROAGENT_STORAGE__ENDPOINT_URL=http://localhost:9000
```

**Docker Development:**
```bash
# Start all services
docker-compose up

# Backend will be at http://localhost:8079
```

**Testing:**
```bash
# .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neuroagent_test"
NEUROAGENT_RATE_LIMITER__DISABLED=true
NEUROAGENT_ACCOUNTING__DISABLED=true
```

---

## Database Operations

### Creating a New Migration

```bash
# 1. Edit prisma/schema.prisma
# Example: Add a new field
model Thread {
  // ... existing fields
  description String? @db.VarChar
}

# 2. Create and apply migration
npm run db:migrate
# Enter migration name: add_thread_description

# 3. Prisma Client is automatically regenerated
```

### Viewing Database

```bash
# Open Prisma Studio (GUI)
npm run db:studio
# Opens at http://localhost:5555

# Or use psql
psql $DATABASE_URL
```

### Common Database Queries

**List all threads for a user:**
```typescript
const threads = await prisma.thread.findMany({
  where: { userId: userId },
  orderBy: { updateDate: 'desc' },
  include: {
    messages: {
      select: { id: true, entity: true, creationDate: true },
    },
  },
});
```

**Get thread with full message history:**
```typescript
const thread = await prisma.thread.findUnique({
  where: { id: threadId },
  include: {
    messages: {
      include: {
        toolCalls: true,
        tokenConsumption: true,
      },
      orderBy: { creationDate: 'asc' },
    },
  },
});
```

**Create thread with first message:**
```typescript
const thread = await prisma.thread.create({
  data: {
    id: crypto.randomUUID(),
    title: 'New Chat',
    userId: userId,
    creationDate: new Date(),
    updateDate: new Date(),
    messages: {
      create: {
        id: crypto.randomUUID(),
        entity: 'USER',
        content: JSON.stringify({ role: 'user', content: 'Hello' }),
        isComplete: true,
        creationDate: new Date(),
      },
    },
  },
  include: { messages: true },
});
```

**Delete old threads:**
```typescript
const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - 6);

await prisma.thread.deleteMany({
  where: {
    updateDate: { lt: cutoffDate },
  },
});
```

**Get token consumption statistics:**
```typescript
const stats = await prisma.tokenConsumption.groupBy({
  by: ['model', 'type'],
  _sum: { count: true },
  where: {
    message: {
      thread: {
        userId: userId,
      },
    },
  },
});
```

### Resetting Database (Development Only)

```bash
# WARNING: This deletes all data!
npx prisma migrate reset

# Confirm when prompted
# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations
```

---

## API Testing

### Using curl

**Health check:**
```bash
curl http://localhost:8079/api/healthz
```

**Create thread:**
```bash
curl -X POST http://localhost:8079/api/threads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Thread",
    "vlabId": null,
    "projectId": null
  }'
```

**Send chat message:**
```bash
curl -X POST http://localhost:8079/api/qa/chat_streamed/THREAD_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "What is the hippocampus?",
    "model": "gpt-4"
  }'
```

**List threads:**
```bash
curl http://localhost:8079/api/threads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Search threads:**
```bash
curl "http://localhost:8079/api/threads?search=hippocampus&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using httpie

```bash
# Install httpie
brew install httpie  # macOS
# or
pip install httpie

# Health check
http GET localhost:8079/api/healthz

# Create thread
http POST localhost:8079/api/threads \
  Authorization:"Bearer YOUR_TOKEN" \
  title="Test Thread"

# Send message
http POST localhost:8079/api/qa/chat_streamed/THREAD_ID \
  Authorization:"Bearer YOUR_TOKEN" \
  content="What is the hippocampus?"
```

### Testing with Postman

1. Import collection from `docs/postman/`
2. Set environment variables:
   - `base_url`: `http://localhost:8079`
   - `auth_token`: Your JWT token
3. Run requests

### Getting a Test JWT Token

For development, you can generate a test token:

```typescript
// scripts/generate-test-token.ts
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode('your-secret-key');

const token = await new SignJWT({
  sub: 'test-user-id',
  email: 'test@example.com',
  groups: ['test-group'],
})
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('24h')
  .sign(secret);

console.log(token);
```

---

## Tool Development

### Creating a New Tool

**1. Create tool file:**
```bash
touch src/lib/tools/my-new-tool.ts
```

**2. Implement tool:**
```typescript
// src/lib/tools/my-new-tool.ts
import { BaseTool } from './base-tool';
import { z } from 'zod';

const MyToolInputSchema = z.object({
  param: z.string().describe('Parameter description'),
});

interface MyToolContext extends BaseContextVariables {
  apiKey: string;
}

export class MyNewTool extends BaseTool<
  typeof MyToolInputSchema,
  MyToolContext
> {
  static readonly toolName = 'my_new_tool';
  static readonly toolDescription = 'Does something useful';

  contextVariables: MyToolContext;
  inputSchema = MyToolInputSchema;

  constructor(contextVariables: MyToolContext) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof this.inputSchema>) {
    // Implementation
    return { result: 'success' };
  }
}
```

**3. Register tool:**
```typescript
// src/lib/tools/index.ts
export * from './my-new-tool';

export async function registerToolClasses() {
  const { MyNewTool } = await import('./my-new-tool');
  toolRegistry.registerClass(MyNewTool);
}
```

**4. Create tests:**
```typescript
// tests/tools/my-new-tool.test.ts
import { describe, it, expect } from 'vitest';
import { MyNewTool } from '@/lib/tools/my-new-tool';

describe('MyNewTool', () => {
  it('should execute successfully', async () => {
    const tool = new MyNewTool({ apiKey: 'test' });
    const result = await tool.execute({ param: 'test' });
    expect(result).toHaveProperty('result');
  });
});
```

**5. Test the tool:**
```bash
npm test tests/tools/my-new-tool.test.ts
```

### Testing a Tool Manually

```typescript
// scripts/test-tool.ts
import { MyNewTool } from '@/lib/tools/my-new-tool';

const tool = new MyNewTool({
  apiKey: process.env.API_KEY!,
});

const result = await tool.execute({
  param: 'test value',
});

console.log('Result:', result);
```

```bash
npx tsx scripts/test-tool.ts
```

---

## Debugging

### Enable Debug Logging

```bash
# All debug logs
DEBUG=* npm run dev

# Specific module
DEBUG=prisma:* npm run dev

# Multiple modules
DEBUG=prisma:*,agent:* npm run dev
```

### Prisma Query Logging

```typescript
// src/lib/db/client.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Node.js Inspector

```bash
# Start with inspector
NODE_OPTIONS='--inspect' npm run dev

# Then open chrome://inspect in Chrome
# Click "inspect" on your Node process
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Common Debugging Scenarios

**Debug streaming responses:**
```typescript
// Add logging in agent routine
console.log('[Agent] Starting stream');
console.log('[Agent] Messages:', messages);
console.log('[Agent] Tools:', Object.keys(tools));

const result = streamText({
  // ...
  onFinish: async (completion) => {
    console.log('[Agent] Stream finished:', completion);
  },
});
```

**Debug tool execution:**
```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  console.log(`[${this.getName()}] Input:`, input);

  try {
    const result = await this.operation();
    console.log(`[${this.getName()}] Result:`, result);
    return result;
  } catch (error) {
    console.error(`[${this.getName()}] Error:`, error);
    throw error;
  }
}
```

**Debug database queries:**
```typescript
// Enable query logging
const result = await prisma.thread.findMany({
  where: { userId },
});
console.log('Query result:', result);
```

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test tests/api/threads.test.ts

# Specific test
npm test -- --grep "should create thread"

# Verbose output
npm test -- --reporter=verbose
```

### Writing Tests

**Unit test:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyFunction', () => {
  beforeEach(() => {
    // Setup
  });

  it('should work correctly', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

**Async test:**
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

**Test with mocks:**
```typescript
import { vi } from 'vitest';

it('should call external API', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });

  global.fetch = mockFetch;

  await myFunction();

  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.example.com',
    expect.any(Object)
  );
});
```

### Test Database Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/db/client';

beforeAll(async () => {
  // Setup test database
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
});
```

---

## Deployment

### Building for Production

```bash
# Build
npm run build

# Test production build locally
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t neuroagent-backend-ts .

# Run container
docker run -p 8079:8079 \
  --env-file .env.production \
  neuroagent-backend-ts

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up
```

### Environment Variables for Production

```bash
# Required
DATABASE_URL=postgresql://...
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_KEYCLOAK__ISSUER=https://...

# Recommended
NODE_ENV=production
NEUROAGENT_RATE_LIMITER__DISABLED=false
NEUROAGENT_ACCOUNTING__DISABLED=false
```

### Health Checks

```bash
# Application health
curl https://your-domain.com/api/healthz

# Database connectivity
curl https://your-domain.com/api/

# Settings endpoint
curl https://your-domain.com/api/settings
```

### Database Migrations in Production

```bash
# Apply migrations
npm run db:migrate:deploy

# Check migration status
npx prisma migrate status
```

---

## Monitoring

### Logging

**Application logs:**
```bash
# Docker
docker-compose logs -f backend-ts

# PM2
pm2 logs backend-ts

# Systemd
journalctl -u backend-ts -f
```

**Log levels:**
```bash
# Set log level
NEUROAGENT_LOGGING__LEVEL=debug npm run dev
```

### Metrics

**Token consumption:**
```typescript
const stats = await prisma.tokenConsumption.aggregate({
  _sum: { count: true },
  _avg: { count: true },
  where: {
    creationDate: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  },
});
```

**Active threads:**
```typescript
const activeThreads = await prisma.thread.count({
  where: {
    updateDate: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  },
});
```

**Error rate:**
```bash
# Count errors in logs
grep "ERROR" logs/app.log | wc -l
```

### Performance Monitoring

**Slow queries:**
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn('Slow query:', e.query, `${e.duration}ms`);
  }
});
```

**Response times:**
```typescript
// Middleware to log response times
export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    const response = await handler(request);
    const duration = Date.now() - start;
    console.log(`GET ${request.url} - ${duration}ms`);
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`GET ${request.url} - ${duration}ms - ERROR`);
    throw error;
  }
}
```

---

## Additional Resources

- [README](../README.md) - Project overview and setup
- [Migration Guide](./MIGRATION-GUIDE.md) - Python to TypeScript migration
- [API Reference](./API-REFERENCE.md) - Complete API documentation
- [Tool Development Guide](./TOOL-DEVELOPMENT-GUIDE.md) - Creating tools
- [Database Schema](./DATABASE-SCHEMA.md) - Database documentation
- [Configuration Guide](./CONFIGURATION-GUIDE.md) - Configuration options
