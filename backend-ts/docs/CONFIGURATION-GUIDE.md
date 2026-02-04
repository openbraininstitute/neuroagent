# Configuration Guide

Complete guide to configuring the Neuroagent TypeScript backend.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Configuration Sections](#configuration-sections)
4. [Loading Configuration](#loading-configuration)
5. [Validation](#validation)
6. [Common Configurations](#common-configurations)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Neuroagent backend uses environment variables for configuration, validated with Zod schemas. All configuration is loaded at startup and validated before the application runs.

**Key Features:**

- Type-safe configuration with Zod
- Nested configuration structure (matching Python backend)
- Environment variable prefixing (`NEUROAGENT_`)
- Nested delimiter (`__`) for hierarchical config
- Validation with helpful error messages
- Default values for optional settings

**Configuration File:** `src/lib/config/settings.ts`

---

## Environment Variables

### Naming Convention

Environment variables use the `NEUROAGENT_` prefix with `__` as the nested delimiter:

```bash
NEUROAGENT_<SECTION>__<SUBSECTION>__<KEY>=value
```

**Examples:**

```bash
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_AGENT__MAX_TURNS=10
NEUROAGENT_TOOLS__ENTITYCORE__URL=https://api.example.com
```

### Environment Files

**Development:**

```bash
# .env (not committed)
DATABASE_URL="postgresql://..."
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
```

**Production:**

```bash
# Set environment variables in deployment platform
# Or use .env.production
```

**Docker:**

```bash
# .env.docker
# Used by docker-compose
```

---

## Configuration Sections

### 1. Agent Configuration

Controls agent behavior and limits.

**Environment Variables:**

```bash
NEUROAGENT_AGENT__MODEL=simple              # Agent model type
NEUROAGENT_AGENT__MAX_TURNS=10              # Max conversation turns
NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS=10  # Max parallel tools
```

**Schema:**

```typescript
{
  model: 'simple' | 'multi',  // Default: 'simple'
  maxTurns: number,           // Default: 10
  maxParallelToolCalls: number, // Default: 10
}
```

**Usage:**

```typescript
const settings = getSettings();
console.log(settings.agent.maxTurns); // 10
```

### 2. LLM Configuration

LLM provider settings and model configuration.

**Environment Variables:**

```bash
# OpenAI
NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_LLM__OPENAI_BASE_URL=https://api.openai.com/v1

# OpenRouter
NEUROAGENT_LLM__OPENROUTER_TOKEN=sk-or-...

# Model Selection
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4
NEUROAGENT_LLM__SUGGESTION_MODEL=gpt-3.5-turbo
NEUROAGENT_LLM__DEFAULT_CHAT_REASONING=low

# Generation Parameters
NEUROAGENT_LLM__TEMPERATURE=1
NEUROAGENT_LLM__MAX_TOKENS=4096

# Model Filtering
NEUROAGENT_LLM__WHITELISTED_MODEL_IDS_REGEX=openai.*
```

**Schema:**

```typescript
{
  openaiToken?: string,
  openaiBaseUrl?: string,
  openRouterToken?: string,
  suggestionModel: string,        // Default: 'gpt-5-nano'
  defaultChatModel: string,       // Default: 'gpt-5-mini'
  defaultChatReasoning: string,   // Default: 'low'
  temperature: number,            // Default: 1
  maxTokens?: number,
  whitelistedModelIdsRegex: string, // Default: 'openai.*'
}
```

**Notes:**

- At least one provider token (OpenAI or OpenRouter) is required
- Model names should include provider prefix: `openai/gpt-4`, `openrouter/anthropic/claude-3`
- Regex filters which models users can select

### 3. Database Configuration

PostgreSQL connection settings.

**Environment Variables:**

```bash
# Prisma uses DATABASE_URL directly
DATABASE_URL="postgresql://user:password@localhost:5432/neuroagent"

# Optional: Individual components (for compatibility)
NEUROAGENT_DB__PREFIX=postgresql
NEUROAGENT_DB__USER=neuroagent
NEUROAGENT_DB__PASSWORD=secret
NEUROAGENT_DB__HOST=localhost
NEUROAGENT_DB__PORT=5432
NEUROAGENT_DB__NAME=neuroagent
```

**Schema:**

```typescript
{
  prefix?: string,
  user?: string,
  password?: string,
  host?: string,
  port?: string,
  name?: string,
}
```

**Notes:**

- `DATABASE_URL` is the primary configuration method
- Individual components are for compatibility with Python backend

### 4. Authentication (Keycloak)

Keycloak integration for JWT validation.

**Environment Variables:**

```bash
NEUROAGENT_KEYCLOAK__ISSUER=https://keycloak.example.com/realms/myrealm
```

**Schema:**

```typescript
{
  issuer: string,  // Default: 'https://www.openbraininstitute.org/auth/realms/SBO'
  userInfoEndpoint: string,  // Auto-generated from issuer
}
```

**Notes:**

- `userInfoEndpoint` is automatically constructed as `${issuer}/protocol/openid-connect/userinfo`
- Used for JWT token validation

### 5. Storage Configuration

MinIO/S3 storage settings.

**Environment Variables:**

```bash
NEUROAGENT_STORAGE__ENDPOINT_URL=http://localhost:9000
NEUROAGENT_STORAGE__BUCKET_NAME=neuroagent
NEUROAGENT_STORAGE__ACCESS_KEY=minioadmin
NEUROAGENT_STORAGE__SECRET_KEY=minioadmin
NEUROAGENT_STORAGE__EXPIRES_IN=600  # Presigned URL expiry (seconds)
```

**Schema:**

```typescript
{
  endpointUrl?: string,
  bucketName: string,      // Default: 'neuroagent'
  accessKey?: string,
  secretKey?: string,
  expiresIn: number,       // Default: 600
}
```

**Notes:**

- Used for file uploads and presigned URL generation
- Compatible with both MinIO and AWS S3

### 6. Rate Limiting

Redis-based rate limiting configuration.

**Environment Variables:**

```bash
# Redis Connection
NEUROAGENT_RATE_LIMITER__REDIS_HOST=localhost
NEUROAGENT_RATE_LIMITER__REDIS_PORT=6379
NEUROAGENT_RATE_LIMITER__REDIS_PASSWORD=
NEUROAGENT_RATE_LIMITER__REDIS_SSL=false

# Enable/Disable
NEUROAGENT_RATE_LIMITER__DISABLED=false

# Chat Limits
NEUROAGENT_RATE_LIMITER__LIMIT_CHAT=20
NEUROAGENT_RATE_LIMITER__EXPIRY_CHAT=86400  # 24 hours

# Suggestion Limits
NEUROAGENT_RATE_LIMITER__LIMIT_SUGGESTIONS_OUTSIDE=100
NEUROAGENT_RATE_LIMITER__LIMIT_SUGGESTIONS_INSIDE=500
NEUROAGENT_RATE_LIMITER__EXPIRY_SUGGESTIONS=86400

# Title Generation Limits
NEUROAGENT_RATE_LIMITER__LIMIT_TITLE=10
NEUROAGENT_RATE_LIMITER__EXPIRY_TITLE=86400
```

**Schema:**

```typescript
{
  redisHost: string,               // Default: 'localhost'
  redisPort: number,               // Default: 6379
  redisPassword?: string,
  redisSsl: boolean,               // Default: false
  disabled: boolean,               // Default: false
  limitChat: number,               // Default: 20
  expiryChat: number,              // Default: 86400
  limitSuggestionsOutside: number, // Default: 100
  limitSuggestionsInside: number,  // Default: 500
  expirySuggestions: number,       // Default: 86400
  limitTitle: number,              // Default: 10
  expiryTitle: number,             // Default: 86400
}
```

**Notes:**

- Set `disabled=true` to disable rate limiting (development)
- Different limits for inside/outside virtual labs
- Expiry times in seconds

### 7. Tools Configuration

External service URLs and API keys for tools.

**Environment Variables:**

```bash
# EntityCore
NEUROAGENT_TOOLS__ENTITYCORE__URL=https://api.example.com/entitycore

# OBI-One
NEUROAGENT_TOOLS__OBI_ONE__URL=https://api.example.com/obi-one

# BlueNaaS
NEUROAGENT_TOOLS__BLUENAAS__URL=https://api.example.com/bluenaas

# Sanity CMS
NEUROAGENT_TOOLS__SANITY__PROJECT_ID=fgi7eh1v
NEUROAGENT_TOOLS__SANITY__DATASET=staging
NEUROAGENT_TOOLS__SANITY__VERSION=v2025-02-19

# Thumbnail Generation
NEUROAGENT_TOOLS__THUMBNAIL_GENERATION__URL=https://api.example.com/thumbnail

# Frontend
NEUROAGENT_TOOLS__FRONTEND_BASE_URL=https://example.com

# Tool Filtering
NEUROAGENT_TOOLS__MIN_TOOL_SELECTION=2
NEUROAGENT_TOOLS__WHITELISTED_TOOL_REGEX=.*

# Deno (for Python execution tool)
NEUROAGENT_TOOLS__DENO_ALLOCATED_MEMORY=8192

# Exa API (for web/literature search)
NEUROAGENT_TOOLS__EXA_API_KEY=...
```

**Schema:**

```typescript
{
  obiOne: { url: string },
  bluenaas: { url: string },
  entitycore: { url: string },
  sanity: {
    projectId: string,
    dataset: 'staging' | 'production',
    version: string,
    url: string,  // Auto-generated
  },
  thumbnailGeneration: { url: string },
  frontendBaseUrl: string,
  minToolSelection: number,
  whitelistedToolRegex?: string,
  denoAllocatedMemory: number,
  exaApiKey?: string,
}
```

### 8. Logging Configuration

Logging levels for application and external packages.

**Environment Variables:**

```bash
NEUROAGENT_LOGGING__LEVEL=info
NEUROAGENT_LOGGING__EXTERNAL_PACKAGES=warning
```

**Schema:**

```typescript
{
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical',  // Default: 'info'
  externalPackages: 'debug' | 'info' | 'warning' | 'error' | 'critical',  // Default: 'warning'
}
```

### 9. Miscellaneous Configuration

Other application settings.

**Environment Variables:**

```bash
NEUROAGENT_MISC__APPLICATION_PREFIX=/api
NEUROAGENT_MISC__CORS_ORIGINS=http://localhost:3000,https://example.com
NEUROAGENT_MISC__QUERY_MAX_SIZE=10000
```

**Schema:**

```typescript
{
  applicationPrefix: string,  // Default: ''
  corsOrigins: string,        // Default: ''
  queryMaxSize: number,       // Default: 10000
}
```

### 10. Accounting Configuration

Token usage billing integration.

**Environment Variables:**

```bash
NEUROAGENT_ACCOUNTING__BASE_URL=https://accounting.example.com
NEUROAGENT_ACCOUNTING__DISABLED=false
```

**Schema:**

```typescript
{
  baseUrl?: string,
  disabled: boolean,  // Default: false (or true if no baseUrl)
}
```

**Notes:**

- Automatically disabled if `baseUrl` is not provided
- Used for tracking token consumption and billing

### 11. MCP Configuration

Model Context Protocol server configuration.

**Configuration File:** `src/mcp.json`

**Environment Variables (Secrets):**

```bash
NEUROAGENT_MCP__SECRETS__API_KEY=...
NEUROAGENT_MCP__SECRETS__TOKEN=...
```

**Schema:**

```typescript
{
  servers?: Record<string, {
    command: string,
    args?: string[],
    env?: Record<string, string>,
    toolMetadata?: Record<string, {
      name?: string,
      nameFrontend?: string,
      description?: string,
      descriptionFrontend?: string,
      utterances?: string[],
    }>,
  }>,
  secrets?: Record<string, string>,
}
```

**Notes:**

- MCP servers are defined in `mcp.json`
- Secrets are injected from environment variables
- Servers with unresolved secrets are automatically disabled

---

## Loading Configuration

### At Application Startup

Configuration is loaded and validated when the application starts:

```typescript
import { getSettings } from '@/lib/config/settings';

// Load and validate settings
const settings = getSettings();

// Use settings
console.log(settings.llm.defaultChatModel);
```

### With Caching

For production, use cached settings:

```typescript
import { getCachedSettings } from '@/lib/config/settings';

// Loads once, then caches
const settings = getCachedSettings();
```

### In Tests

Clear cache between tests:

```typescript
import { getSettings, clearSettingsCache } from '@/lib/config/settings';

beforeEach(() => {
  clearSettingsCache();
});

it('should load settings', () => {
  const settings = getSettings();
  expect(settings).toBeDefined();
});
```

---

## Validation

### Zod Validation

All configuration is validated with Zod schemas:

```typescript
const SettingsLLMSchema = z.object({
  openaiToken: z.string().optional(),
  temperature: z.number().default(1),
  maxTokens: z.number().int().optional(),
});
```

### Validation Errors

If validation fails, you'll see detailed error messages:

```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "string",
    "path": ["llm", "temperature"],
    "message": "Expected number, received string"
  }
]
```

### Custom Validation

Some fields have custom validation logic:

```typescript
// Accounting is auto-disabled if no baseUrl
.transform((data) => {
  if (!data.baseUrl) {
    return { ...data, disabled: true };
  }
  return data;
})
```

---

## Common Configurations

### Development (Local)

```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neuroagent"

NEUROAGENT_LLM__OPENAI_TOKEN=sk-...
NEUROAGENT_LLM__DEFAULT_CHAT_MODEL=gpt-4

NEUROAGENT_RATE_LIMITER__DISABLED=true
NEUROAGENT_ACCOUNTING__DISABLED=true

NEUROAGENT_TOOLS__ENTITYCORE__URL=http://localhost:8080
NEUROAGENT_TOOLS__FRONTEND_BASE_URL=http://localhost:3000

NEUROAGENT_STORAGE__ENDPOINT_URL=http://localhost:9000
NEUROAGENT_STORAGE__ACCESS_KEY=minioadmin
NEUROAGENT_STORAGE__SECRET_KEY=minioadmin
```

### Docker Development

```bash
# .env.docker
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/neuroagent"

NEUROAGENT_LLM__OPENAI_TOKEN=sk-...

NEUROAGENT_RATE_LIMITER__REDIS_HOST=redis
NEUROAGENT_RATE_LIMITER__DISABLED=false

NEUROAGENT_STORAGE__ENDPOINT_URL=http://minio:9000
```

### Production

```bash
# Set in deployment platform
DATABASE_URL="postgresql://user:pass@prod-db:5432/neuroagent"

NEUROAGENT_LLM__OPENAI_TOKEN=sk-prod-...
NEUROAGENT_LLM__OPENROUTER_TOKEN=sk-or-prod-...

NEUROAGENT_KEYCLOAK__ISSUER=https://auth.example.com/realms/prod

NEUROAGENT_RATE_LIMITER__REDIS_HOST=prod-redis
NEUROAGENT_RATE_LIMITER__REDIS_PASSWORD=...
NEUROAGENT_RATE_LIMITER__REDIS_SSL=true

NEUROAGENT_STORAGE__ENDPOINT_URL=https://s3.amazonaws.com
NEUROAGENT_STORAGE__ACCESS_KEY=...
NEUROAGENT_STORAGE__SECRET_KEY=...

NEUROAGENT_ACCOUNTING__BASE_URL=https://accounting.example.com
NEUROAGENT_ACCOUNTING__DISABLED=false
```

---

## Troubleshooting

### Configuration Not Loading

**Problem:** Settings are undefined or have default values.

**Solution:**

1. Check environment variable names (case-sensitive)
2. Verify `NEUROAGENT_` prefix
3. Check nested delimiter `__`
4. Restart application after changing `.env`

### Validation Errors

**Problem:** Application fails to start with Zod errors.

**Solution:**

1. Read error message carefully (shows path and expected type)
2. Fix the environment variable
3. Check for typos in variable names

### Missing Required Configuration

**Problem:** Application needs a configuration value that's not set.

**Solution:**

1. Check `.env.example` for required variables
2. Set the missing variable
3. Restart application

### Type Mismatches

**Problem:** String provided where number expected.

**Solution:**

```bash
# ❌ Wrong
NEUROAGENT_AGENT__MAX_TURNS="10"

# ✅ Correct
NEUROAGENT_AGENT__MAX_TURNS=10
```

### Boolean Values

**Problem:** Boolean not recognized.

**Solution:**

```bash
# ✅ Correct (lowercase)
NEUROAGENT_RATE_LIMITER__DISABLED=true
NEUROAGENT_RATE_LIMITER__DISABLED=false

# ❌ Wrong (uppercase)
NEUROAGENT_RATE_LIMITER__DISABLED=TRUE
```

---

## Additional Resources

- [Settings Source Code](../src/lib/config/settings.ts)
- [Environment Example](.env.example)
- [Zod Documentation](https://zod.dev)
- [Migration Guide](./MIGRATION-GUIDE.md)
