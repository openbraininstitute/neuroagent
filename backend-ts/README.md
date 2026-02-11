# Neuroagent TypeScript Backend

TypeScript backend for Neuroagent with native Vercel AI SDK integration, built on Next.js 15+ with App Router.

## Overview

This is a complete rewrite of the Neuroagent backend from Python/FastAPI to TypeScript/Next.js, leveraging:

- **Next.js 15+** with App Router for API routes
- **Vercel AI SDK** for native LLM streaming and tool calling
- **Prisma** for type-safe database operations
- **Zod** for runtime schema validation
- **TypeScript strict mode** for compile-time type safety

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:8079`

## Project Structure

```
backend-ts/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API route handlers
│   │   │   ├── qa/       # Chat and Q&A endpoints
│   │   │   ├── threads/  # Thread management
│   │   │   ├── tools/    # Tool listing
│   │   │   └── storage/  # File storage
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── lib/              # Core library code
│   │   ├── config/       # Configuration management (Zod schemas)
│   │   ├── db/           # Prisma client and utilities
│   │   ├── agents/       # Agent routine logic (Vercel AI SDK)
│   │   ├── tools/        # Tool implementations
│   │   │   ├── base-tool.ts        # Base tool class
│   │   │   ├── web-search.ts       # Web search tool
│   │   │   ├── literature-search.ts # Literature search
│   │   │   ├── entitycore/         # EntityCore tools
│   │   │   └── obione/             # OBIOne tools
│   │   ├── mcp/          # MCP server integration
│   │   ├── middleware/   # Auth, rate limiting, CORS
│   │   └── utils/        # Shared utilities
│   └── types/            # TypeScript type definitions
├── prisma/               # Prisma schema and migrations
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration history
│   ├── README.md         # Prisma documentation
│   ├── MIGRATION_GUIDE.md
│   └── MIGRATION_WORKFLOW.md
├── tests/                # Test suite (Vitest)
│   ├── api/              # API route tests
│   ├── agents/           # Agent routine tests
│   ├── config/           # Configuration tests
│   ├── db/               # Database tests
│   ├── middleware/       # Middleware tests
│   └── tools/            # Tool tests
├── docs/                 # Documentation
├── .env                  # Environment variables (not committed)
├── .env.example          # Environment template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── next.config.ts        # Next.js configuration
├── vitest.config.ts      # Test configuration
└── README.md             # This file
```

## Development Commands

### Starting the Server

```bash
# Development mode with hot reload (port 8079)
npm run dev

# Production build
npm run build

# Start production server (port 8079)
npm start
```

The development server includes:

- Hot module replacement (HMR)
- Automatic TypeScript compilation
- API routes at `/api/*`
- Error overlay for debugging

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Check code formatting (Prettier)
npm run format:check

# Format code automatically
npm run format

# TypeScript type checking (no emit)
npm run type-check
```

**Recommended workflow:**

```bash
# Before committing
npm run lint:fix && npm run format && npm run type-check && npm test
```

## Testing

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test tests/api/chat-streamed.test.ts

# Run tests matching a pattern
npm test -- --grep "authentication"
```

### Test Structure

The project uses **Vitest** for testing with two types of tests:

1. **Unit Tests** - Test specific examples and edge cases
   - Located in `tests/` directory
   - Mirror the `src/` structure
   - Use mocks for external dependencies

2. **Property-Based Tests** - Test universal properties across random inputs
   - Use `@fast-check/vitest` library
   - Run minimum 100 iterations per test
   - Tagged with property numbers from design document

**Example test commands:**

```bash
# Test a specific module
npm test tests/tools/base-tool.test.ts

# Test with verbose output
npm test -- --reporter=verbose

# Test with UI (interactive)
npm test -- --ui

# Generate coverage HTML report
npm run test:coverage
# Open coverage/index.html in browser
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI tools
- `coverage/coverage-final.json` - JSON format

**Coverage goals:**

- Overall: 80%+
- Critical paths (auth, database, tools): 100%

## Database (Prisma)

### Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Create a new migration (development)
npm run db:migrate
# This will:
# 1. Prompt for migration name
# 2. Create migration SQL files
# 3. Apply migration to database
# 4. Regenerate Prisma Client

# Apply migrations (production)
npm run db:migrate:deploy

# Push schema changes without migrations (prototyping)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
# Opens at http://localhost:5555
```

### Common Prisma Workflows

**1. Modifying the database schema:**

```bash
# 1. Edit prisma/schema.prisma
# 2. Create and apply migration
npm run db:migrate
# 3. Enter migration name when prompted (e.g., "add_user_preferences")
```

**2. Viewing/editing data:**

```bash
# Open Prisma Studio
npm run db:studio
# Browse tables, edit records, run queries
```

**3. Resetting the database (development only):**

```bash
# WARNING: This deletes all data!
npx prisma migrate reset
# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations
# 4. Run seed script (if configured)
```

**4. Checking migration status:**

```bash
npx prisma migrate status
```

**5. Generating SQL for a migration (without applying):**

```bash
npx prisma migrate dev --create-only
```

### Prisma Documentation

See `prisma/README.md` for detailed Prisma documentation including:

- Schema syntax and best practices
- Migration workflows
- Troubleshooting common issues
- Production deployment guide

## Environment Configuration

Configuration is managed through environment variables with the `NEUROAGENT_` prefix.

### Setting Up Environment

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env  # or your preferred editor
```

### Key Configuration Sections

**Database (Required):**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/neuroagent"
```

**LLM Providers (At least one required):**

```env
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_LLM__OPEN_ROUTER_TOKEN=sk-or-...
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4
NEUROAGENT_LLM__SUGGESTION_MODEL=gpt-3.5-turbo
NEUROAGENT_LLM__TEMPERATURE=1
```

**Authentication (Required for protected routes):**

```env
NEUROAGENT_KEYCLOAK__ISSUER=https://keycloak.example.com/realms/myrealm
```

**Rate Limiting (Optional, uses Redis):**

```env
NEUROAGENT_RATE_LIMITER__REDIS_HOST=localhost
NEUROAGENT_RATE_LIMITER__REDIS_PORT=6379
NEUROAGENT_RATE_LIMITER__REDIS_PASSWORD=
NEUROAGENT_RATE_LIMITER__DISABLED=false
NEUROAGENT_RATE_LIMITER__LIMIT_CHAT=20
NEUROAGENT_RATE_LIMITER__EXPIRY_CHAT=86400
```

**Storage (Optional, for file uploads):**

```env
NEUROAGENT_STORAGE__ENDPOINT_URL=http://localhost:9000
NEUROAGENT_STORAGE__BUCKET_NAME=neuroagent
NEUROAGENT_STORAGE__ACCESS_KEY=minioadmin
NEUROAGENT_STORAGE__SECRET_KEY=minioadmin
```

**Tools (Optional, for specific features):**

```env
NEUROAGENT_TOOLS__EXA_API_KEY=...  # For web/literature search
NEUROAGENT_TOOLS__ENTITYCORE__URL=https://api.example.com/entitycore
NEUROAGENT_TOOLS__OBI_ONE__URL=https://api.example.com/obione
NEUROAGENT_TOOLS__FRONTEND_BASE_URL=https://example.com
```

**Agent Configuration:**

```env
NEUROAGENT_AGENT__MODEL=simple
NEUROAGENT_AGENT__MAX_TURNS=10
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=10
```

### Environment Validation

The application validates all environment variables at startup using Zod schemas. If required variables are missing or invalid, the application will fail to start with a clear error message.

## API Endpoints

### Chat & Q&A

```bash
# Stream chat response
POST /api/qa/chat_streamed/[thread_id]
Body: { content: string, model?: string }
Headers: Authorization: Bearer <token>

# Generate question suggestions
POST /api/qa/question_suggestions
Body: { threadId?: string, frontendUrl?: string, vlabId?: string, projectId?: string }
Headers: Authorization: Bearer <token>

# List available models
GET /api/qa/models
Headers: Authorization: Bearer <token>
```

### Thread Management

```bash
# List threads
GET /api/threads
Query: ?search=<query>&limit=<number>&offset=<number>
Headers: Authorization: Bearer <token>

# Create thread
POST /api/threads
Body: { title: string, vlabId?: string, projectId?: string }
Headers: Authorization: Bearer <token>

# Get thread
GET /api/threads/[thread_id]
Headers: Authorization: Bearer <token>

# Update thread
PATCH /api/threads/[thread_id]
Body: { title?: string }
Headers: Authorization: Bearer <token>

# Delete thread
DELETE /api/threads/[thread_id]
Headers: Authorization: Bearer <token>
```

### Tools & Storage

```bash
# List available tools
GET /api/tools
Headers: Authorization: Bearer <token>

# Storage operations
GET /api/storage
Headers: Authorization: Bearer <token>
```

### Health & Settings

```bash
# Health check
GET /api/healthz

# Readiness check
GET /api/

# Get settings
GET /api/settings
```

### Testing API Endpoints

```bash
# Using curl
curl -X POST http://localhost:8079/api/qa/chat_streamed/thread-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"content": "Hello, how are you?"}'

# Using httpie
http POST localhost:8079/api/qa/chat_streamed/thread-id \
  Authorization:"Bearer your-token" \
  content="Hello, how are you?"
```

## Docker

### Building and Running

```bash
# Build Docker image
docker build -t neuroagent-backend-ts .

# Run container
docker run -p 8079:8079 \
  --env-file .env \
  neuroagent-backend-ts

# Using docker-compose (recommended)
docker-compose up backend-ts

# Build and run
docker-compose up --build backend-ts

# Run in background
docker-compose up -d backend-ts

# View logs
docker-compose logs -f backend-ts

# Stop container
docker-compose down
```

### Docker Compose Services

The `docker-compose.yml` includes:

- `backend-ts` - TypeScript backend (port 8079)
- `postgres` - PostgreSQL database (port 5432)
- `redis` - Redis for rate limiting (port 6379)
- `minio` - MinIO for storage (ports 9000, 9001)

```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up backend-ts postgres redis

# Rebuild after code changes
docker-compose up --build backend-ts
```

## Troubleshooting

### Common Issues

**1. Port already in use:**

```bash
# Check what's using port 8079
lsof -i :8079

# Kill the process
kill -9 <PID>

# Or change port in package.json
"dev": "next dev -p 8080"
```

**2. Prisma Client out of sync:**

```bash
# Regenerate Prisma Client
npm run db:generate
```

**3. Database connection errors:**

```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
docker-compose ps postgres

# Test connection
psql $DATABASE_URL
```

**4. TypeScript errors:**

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**5. Test failures:**

```bash
# Clear test cache
npx vitest --clearCache

# Run tests with verbose output
npm test -- --reporter=verbose
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Next.js specific debugging
NODE_OPTIONS='--inspect' npm run dev
# Then open chrome://inspect in Chrome

# Prisma query logging
# Add to prisma/schema.prisma:
# generator client {
#   provider = "prisma-client-js"
#   log      = ["query", "info", "warn", "error"]
# }
```

## Development Workflow

### Adding a New API Route

1. Create route file: `src/app/api/your-route/route.ts`
2. Implement handler:

```typescript
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return Response.json({ message: 'Hello' });
}
```

3. Add tests: `tests/api/your-route.test.ts`
4. Update this README with endpoint documentation

### Adding a New Tool

1. Create tool file: `src/lib/tools/your-tool.ts`
2. Extend `BaseTool`:

```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

export class YourTool extends BaseTool<typeof YourToolInputSchema> {
  metadata = {
    name: 'your_tool',
    description: 'Tool description',
  };

  inputSchema = z.object({
    param: z.string(),
  });

  async execute(input: z.infer<typeof this.inputSchema>) {
    // Implementation
    return { result: 'data' };
  }
}

const YourToolInputSchema = z.object({
  param: z.string(),
});
```

3. Register in `src/lib/tools/index.ts`
4. Add tests: `tests/tools/your-tool.test.ts`

### Modifying Database Schema

1. Edit `prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Name migration descriptively
4. Test migration: `npm test tests/db/`
5. Update types if needed
6. Document in `prisma/MIGRATION_GUIDE.md`

## Useful NPM Scripts Reference

| Command                     | Description                           |
| --------------------------- | ------------------------------------- |
| `npm run dev`               | Start development server on port 8079 |
| `npm run build`             | Build for production                  |
| `npm start`                 | Start production server               |
| `npm test`                  | Run all tests once                    |
| `npm run test:watch`        | Run tests in watch mode               |
| `npm run test:coverage`     | Run tests with coverage report        |
| `npm run lint`              | Run ESLint                            |
| `npm run lint:fix`          | Fix ESLint issues automatically       |
| `npm run format`            | Format code with Prettier             |
| `npm run format:check`      | Check code formatting                 |
| `npm run type-check`        | TypeScript type checking              |
| `npm run db:generate`       | Generate Prisma Client                |
| `npm run db:migrate`        | Create and apply migration            |
| `npm run db:migrate:deploy` | Apply migrations (production)         |
| `npm run db:push`           | Push schema without migration         |
| `npm run db:studio`         | Open Prisma Studio GUI                |

## Additional Prisma Commands

These commands use `npx prisma` directly:

```bash
# View migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create migration without applying
npx prisma migrate dev --create-only

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from existing database
npx prisma db pull

# Seed database (if seed script configured)
npx prisma db seed
```

## Performance Optimization

### Production Build

```bash
# Build with optimizations
npm run build

# Analyze bundle size
npm run build -- --analyze

# Start production server
npm start
```

### Database Query Optimization

```bash
# Enable query logging
# Edit prisma/schema.prisma and add log configuration

# Use Prisma Studio to inspect queries
npm run db:studio

# Add database indexes for frequently queried fields
# Edit schema.prisma:
# @@index([fieldName])
```

## Documentation

### Core Documentation

- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Comprehensive deployment guide for all environments
- **[QUICK-START-DEPLOYMENT.md](docs/QUICK-START-DEPLOYMENT.md)** - Quick start guide for common deployment scenarios
- **[PRODUCTION-READINESS-CHECKLIST.md](docs/PRODUCTION-READINESS-CHECKLIST.md)** - Pre-deployment checklist
- **[CONFIGURATION-GUIDE.md](docs/CONFIGURATION-GUIDE.md)** - Environment configuration reference
- **[API-REFERENCE.md](docs/API-REFERENCE.md)** - API endpoint documentation
- **[COMMON-OPERATIONS.md](docs/COMMON-OPERATIONS.md)** - Common operational tasks

### Database Documentation

- `prisma/README.md` - Prisma schema and migration guide
- `prisma/MIGRATION_GUIDE.md` - Database migration best practices
- `prisma/MIGRATION_WORKFLOW.md` - Step-by-step migration workflows
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** - Database schema documentation

### Development Documentation

- **[TOOL-DEVELOPMENT-GUIDE.md](docs/TOOL-DEVELOPMENT-GUIDE.md)** - Guide for creating new tools
- **[MIGRATION-GUIDE.md](docs/MIGRATION-GUIDE.md)** - Python to TypeScript migration guide
- `src/lib/tools/README.md` - Tool system overview
- `src/lib/middleware/README.md` - Middleware documentation
- `docs/` - Task summaries and implementation notes

### CI/CD

- `.github/workflows/ci-cd.yml.example` - Example GitHub Actions workflow

## Architecture

### Key Technologies

- **Next.js 15+** - React framework with App Router
- **Vercel AI SDK** - Native LLM streaming and tool calling
- **Prisma** - Type-safe ORM for PostgreSQL
- **Zod** - Runtime schema validation
- **Vitest** - Fast unit testing framework
- **fast-check** - Property-based testing
- **TypeScript** - Static type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting

### Design Principles

1. **Type Safety** - TypeScript strict mode + Zod runtime validation
2. **Testability** - Comprehensive unit and property-based tests
3. **Modularity** - Clear separation of concerns (tools, middleware, agents)
4. **API Compatibility** - Maintains compatibility with Python backend
5. **Performance** - Streaming responses, connection pooling, caching
6. **Security** - JWT authentication, rate limiting, input validation

## Migration from Python Backend

This TypeScript backend maintains API compatibility with the Python/FastAPI backend:

- **Endpoint paths** - Identical URL structure
- **Request/response formats** - Compatible JSON schemas
- **Streaming format** - Compatible with Vercel AI SDK format
- **Authentication** - Same Keycloak integration
- **Database schema** - Equivalent Prisma models

See migration documentation for detailed mapping.

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write tests for new features
- Document public APIs with JSDoc comments
- Use meaningful variable and function names

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run quality checks: `npm run lint:fix && npm run format && npm run type-check && npm test`
4. Commit with descriptive message
5. Push and create pull request
6. Ensure CI passes

## License

See LICENSE.md in the root directory.

## Support

For issues and questions:

- Check documentation in `docs/` and `prisma/`
- Review existing issues on GitHub
- Create new issue with reproduction steps
