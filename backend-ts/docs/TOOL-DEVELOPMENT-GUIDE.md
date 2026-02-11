# Tool Development Guide

Complete guide for developing tools in the Neuroagent TypeScript backend.

## Table of Contents

1. [Overview](#overview)
2. [Tool Architecture](#tool-architecture)
3. [Creating a New Tool](#creating-a-new-tool)
4. [Tool Metadata](#tool-metadata)
5. [Input Validation](#input-validation)
6. [Context Variables](#context-variables)
7. [Tool Execution](#tool-execution)
8. [Error Handling](#error-handling)
9. [Testing Tools](#testing-tools)
10. [Tool Registration](#tool-registration)
11. [Advanced Patterns](#advanced-patterns)
12. [Best Practices](#best-practices)

---

## Overview

Tools are the primary way the LLM agent interacts with external systems and performs actions. Each tool:

- Extends the `BaseTool` abstract class
- Defines static metadata (name, description, utterances)
- Specifies an input schema using Zod
- Implements an `execute` method
- Converts to Vercel AI SDK format automatically

**Key Principle:** Tools are instantiated **on-demand** when the LLM calls them, not at startup.

---

## Tool Architecture

### Class-Based Design

Tools use a class-based design with static properties for metadata:

```typescript
export class MyTool extends BaseTool<typeof MyToolInputSchema, MyContextVariables> {
  // Static metadata (ClassVar pattern from Python)
  static readonly toolName = 'my_tool';
  static readonly toolDescription = 'Does something useful';

  // Instance properties
  contextVariables: MyContextVariables;
  inputSchema = MyToolInputSchema;

  // Execution logic
  async execute(input: z.infer<typeof this.inputSchema>) {
    // Implementation
  }
}
```

### Lazy Instantiation Pattern

**Important:** Tools are NOT instantiated at application startup. Instead:

1. **Startup:** Register tool CLASSES (not instances) in the registry
2. **LLM Selection:** LLM decides which tools to use based on metadata
3. **Execution:** Instantiate the specific tool when LLM calls it
4. **Cleanup:** Tool instance is discarded after execution

This pattern:

- Reduces memory usage (no unused tool instances)
- Allows per-request context (user-specific configuration)
- Matches Python's ClassVar pattern

---

## Creating a New Tool

### Step 1: Define Input Schema

Use Zod to define the tool's input parameters:

```typescript
import { z } from 'zod';

const WebSearchInputSchema = z.object({
  query: z.string().describe('The search query'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum number of results to return'),
  language: z.enum(['en', 'es', 'fr', 'de']).optional().describe('Language for search results'),
});
```

**Best Practices:**

- Use `.describe()` for all fields (helps LLM understand parameters)
- Set reasonable defaults with `.default()`
- Add validation constraints (`.min()`, `.max()`, `.email()`, etc.)
- Use enums for fixed choices
- Make optional fields explicit with `.optional()`

### Step 2: Define Context Variables

Context variables are runtime dependencies passed from the app:

```typescript
interface WebSearchContextVariables extends BaseContextVariables {
  apiKey: string;
  apiUrl: string;
  httpClient: typeof fetch;
}
```

**Context vs Input:**

- **Context:** App-provided (API keys, URLs, HTTP clients)
- **Input:** LLM-provided (user query, parameters)

### Step 3: Implement the Tool Class

```typescript
import { BaseTool } from './base-tool';
import { z } from 'zod';

export class WebSearchTool extends BaseTool<
  typeof WebSearchInputSchema,
  WebSearchContextVariables
> {
  // Static metadata (accessible without instantiation)
  static readonly toolName = 'web_search';
  static readonly toolNameFrontend = 'Web Search';
  static readonly toolDescription = 'Search the web for information using a search engine API';
  static readonly toolDescriptionFrontend = 'Search the internet for current information';
  static readonly toolUtterances = [
    'search the web',
    'find information online',
    'look up on the internet',
  ];

  // Instance properties
  contextVariables: WebSearchContextVariables;
  inputSchema = WebSearchInputSchema;

  constructor(contextVariables: WebSearchContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof this.inputSchema>) {
    const { query, maxResults, language } = input;

    // Use context variables
    const response = await this.contextVariables.httpClient(
      `${this.contextVariables.apiUrl}/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.contextVariables.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, max_results: maxResults, language }),
      }
    );

    if (!response.ok) {
      throw new Error(`Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      results: data.results,
      query: query,
      count: data.results.length,
    };
  }

  // Optional: Custom health check
  async isOnline(): Promise<boolean> {
    try {
      const response = await this.contextVariables.httpClient(
        `${this.contextVariables.apiUrl}/health`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## Tool Metadata

### Required Static Properties

| Property                  | Type       | Required | Description                       |
| ------------------------- | ---------- | -------- | --------------------------------- |
| `toolName`                | `string`   | Yes      | Unique identifier (snake_case)    |
| `toolDescription`         | `string`   | Yes      | What the tool does (for LLM)      |
| `toolNameFrontend`        | `string`   | No       | Display name for UI               |
| `toolDescriptionFrontend` | `string`   | No       | User-friendly description         |
| `toolUtterances`          | `string[]` | No       | Example phrases that trigger tool |

### Naming Conventions

**Backend Names (toolName):**

- Use snake_case: `web_search`, `get_brain_region`
- Be descriptive but concise
- Avoid special characters
- Must be unique across all tools

**Frontend Names (toolNameFrontend):**

- Use Title Case: `Web Search`, `Get Brain Region`
- User-friendly and clear
- Can include spaces and punctuation

### Descriptions

**Backend Description (toolDescription):**

- Technical and precise
- Explain what the tool does
- Include key capabilities
- Used by LLM to decide when to use tool

Example:

```typescript
static readonly toolDescription =
  'Search the web for current information using a search engine API. ' +
  'Returns up to 100 results with titles, URLs, and snippets. ' +
  'Supports multiple languages and filtering options.';
```

**Frontend Description (toolDescriptionFrontend):**

- User-friendly language
- Explain benefits to user
- Shorter and simpler

Example:

```typescript
static readonly toolDescriptionFrontend =
  'Search the internet for up-to-date information on any topic';
```

### Utterances

Utterances help the LLM understand when to use the tool:

```typescript
static readonly toolUtterances = [
  'search the web',
  'find online',
  'look up information',
  'google',
  'search for',
];
```

**Best Practices:**

- Include 3-10 utterances
- Use natural language phrases
- Include synonyms and variations
- Consider user intent

---

## Input Validation

### Zod Schema Patterns

**String Validation:**

```typescript
z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long')
    .describe('Search query'),

  email: z.string().email('Invalid email format').describe('User email address'),

  url: z.string().url('Invalid URL format').describe('Website URL'),
});
```

**Number Validation:**

```typescript
z.object({
  age: z
    .number()
    .int('Age must be an integer')
    .min(0, 'Age cannot be negative')
    .max(150, 'Age too high')
    .describe('User age'),

  temperature: z
    .number()
    .min(-273.15, 'Below absolute zero')
    .max(1000, 'Temperature too high')
    .describe('Temperature in Celsius'),

  percentage: z.number().min(0).max(100).describe('Percentage value'),
});
```

**Array Validation:**

```typescript
z.object({
  tags: z
    .array(z.string())
    .min(1, 'At least one tag required')
    .max(10, 'Too many tags')
    .describe('List of tags'),

  coordinates: z.array(z.number()).length(2, 'Must be [x, y]').describe('2D coordinates'),
});
```

**Enum Validation:**

```typescript
z.object({
  status: z.enum(['pending', 'active', 'completed']).describe('Task status'),

  priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Task priority'),
});
```

**Optional Fields:**

```typescript
z.object({
  required: z.string().describe('Required field'),
  optional: z.string().optional().describe('Optional field'),
  withDefault: z.string().default('default').describe('Has default'),
  nullable: z.string().nullable().describe('Can be null'),
});
```

**Complex Objects:**

```typescript
z.object({
  user: z
    .object({
      name: z.string(),
      email: z.string().email(),
    })
    .describe('User information'),

  metadata: z.record(z.string(), z.any()).describe('Additional metadata'),
});
```

---

## Context Variables

### Defining Context Variables

Context variables contain runtime dependencies:

```typescript
interface MyToolContextVariables extends BaseContextVariables {
  // API credentials
  apiKey: string;
  apiUrl: string;

  // HTTP client
  httpClient: typeof fetch;

  // User context
  userId?: string;
  vlabId?: string;
  projectId?: string;

  // Configuration
  maxRetries: number;
  timeout: number;
}
```

### Using Context Variables

Access context variables in the `execute` method:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // Access API credentials
  const apiKey = this.contextVariables.apiKey;

  // Use HTTP client
  const response = await this.contextVariables.httpClient(
    this.contextVariables.apiUrl,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    }
  );

  // Use user context
  if (this.contextVariables.userId) {
    // User-specific logic
  }

  return result;
}
```

### Common Context Variables

**HTTP Clients:**

```typescript
httpClient: typeof fetch; // Standard fetch API
axiosClient: AxiosInstance; // Axios instance
```

**API Configuration:**

```typescript
apiUrl: string; // Base URL
apiKey: string; // Authentication key
apiVersion: string; // API version
```

**User Context:**

```typescript
userId: string;  // Current user ID
vlabId?: string;  // Virtual lab ID
projectId?: string;  // Project ID
userGroups: string[];  // User permissions
```

**Application Context:**

```typescript
frontendUrl: string; // Frontend base URL
storageClient: S3Client; // Storage client
databaseClient: PrismaClient; // Database client
```

---

## Tool Execution

### Execute Method

The `execute` method contains the tool's main logic:

```typescript
async execute(input: z.infer<typeof this.inputSchema>): Promise<unknown> {
  // 1. Extract and validate input
  const { query, maxResults } = input;

  // 2. Perform the operation
  const results = await this.performSearch(query, maxResults);

  // 3. Transform and return results
  return {
    success: true,
    results: results,
    count: results.length,
  };
}
```

### Return Values

**Return any JSON-serializable value:**

```typescript
// Simple value
return "Operation completed";

// Object
return {
  status: "success",
  data: { id: 123, name: "Example" },
};

// Array
return [
  { id: 1, title: "Result 1" },
  { id: 2, title: "Result 2" },
];

// Complex nested structure
return {
  metadata: { timestamp: Date.now() },
  results: [...],
  pagination: { page: 1, total: 100 },
};
```

**Best Practices:**

- Return structured data (objects/arrays)
- Include status indicators
- Provide context (counts, metadata)
- Keep responses concise but informative
- Avoid returning raw HTML or binary data

### Async Operations

All tool execution is asynchronous:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // Parallel operations
  const [data1, data2] = await Promise.all([
    this.fetchData1(),
    this.fetchData2(),
  ]);

  // Sequential operations
  const result1 = await this.step1();
  const result2 = await this.step2(result1);

  // With timeout
  const result = await Promise.race([
    this.operation(),
    this.timeout(5000),
  ]);

  return { data1, data2, result };
}
```

---

## Error Handling

### Throwing Errors

Throw descriptive errors for failures:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // Validation errors
  if (!this.contextVariables.apiKey) {
    throw new Error('API key not configured');
  }

  // API errors
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  // Business logic errors
  if (results.length === 0) {
    throw new Error('No results found for query');
  }

  return results;
}
```

### Error Messages

**Good error messages:**

- Specific and actionable
- Include context (what failed, why)
- Suggest solutions when possible

```typescript
// ❌ Bad
throw new Error('Failed');

// ✅ Good
throw new Error(
  'Failed to fetch brain region data: API returned 404. ' +
    'The region ID may not exist in the database.'
);
```

### Try-Catch Patterns

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  try {
    const result = await this.riskyOperation();
    return result;
  } catch (error) {
    // Log error for debugging
    console.error('Tool execution failed:', error);

    // Re-throw with context
    throw new Error(
      `Failed to execute ${this.getName()}: ${error.message}`
    );
  }
}
```

### Graceful Degradation

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  try {
    // Try primary source
    return await this.fetchFromPrimary();
  } catch (primaryError) {
    console.warn('Primary source failed, trying fallback');

    try {
      // Try fallback source
      return await this.fetchFromFallback();
    } catch (fallbackError) {
      // Both failed
      throw new Error(
        'All data sources failed. ' +
        `Primary: ${primaryError.message}. ` +
        `Fallback: ${fallbackError.message}`
      );
    }
  }
}
```

---

## Testing Tools

### Unit Tests

Create tests in `tests/tools/your-tool.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { WebSearchTool } from '@/lib/tools/web-search';

describe('WebSearchTool', () => {
  let tool: WebSearchTool;
  let mockContext: WebSearchContextVariables;

  beforeEach(() => {
    mockContext = {
      apiKey: 'test-key',
      apiUrl: 'https://api.example.com',
      httpClient: fetch,
    };
    tool = new WebSearchTool(mockContext);
  });

  it('should have correct metadata', () => {
    expect(WebSearchTool.toolName).toBe('web_search');
    expect(WebSearchTool.toolDescription).toBeDefined();
  });

  it('should validate input schema', async () => {
    const validInput = { query: 'test', maxResults: 10 };
    const result = await tool.inputSchema.parseAsync(validInput);
    expect(result).toEqual(validInput);
  });

  it('should execute search successfully', async () => {
    const input = { query: 'neuroscience', maxResults: 5 };
    const result = await tool.execute(input);

    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('count');
  });

  it('should handle errors gracefully', async () => {
    const invalidInput = { query: '', maxResults: -1 };

    await expect(tool.inputSchema.parseAsync(invalidInput)).rejects.toThrow();
  });
});
```

### Integration Tests

Test tool with real dependencies (using mocks):

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('WebSearchTool Integration', () => {
  it('should integrate with Vercel AI SDK', async () => {
    const tool = new WebSearchTool(mockContext);
    const vercelTool = tool.toVercelTool();

    expect(vercelTool).toHaveProperty('description');
    expect(vercelTool).toHaveProperty('parameters');
    expect(vercelTool).toHaveProperty('execute');
  });

  it('should work in agent routine', async () => {
    // Mock the agent routine
    const mockAgent = {
      tools: { web_search: tool.toVercelTool() },
    };

    // Test tool execution through agent
    const result = await mockAgent.tools.web_search.execute({
      query: 'test',
      maxResults: 5,
    });

    expect(result).toBeDefined();
  });
});
```

### Property-Based Tests

Test tool with random inputs:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.string({ minLength: 1, maxLength: 100 }), fc.integer({ min: 1, max: 100 })])(
  'should handle any valid input',
  async (query, maxResults) => {
    const tool = new WebSearchTool(mockContext);
    const input = { query, maxResults };

    // Should not throw for valid inputs
    const result = await tool.execute(input);
    expect(result).toBeDefined();
  }
);
```

---

## Tool Registration

### Registering Tool Classes

Register tools at application startup:

```typescript
// src/lib/tools/index.ts
import { toolRegistry } from './base-tool';
import { WebSearchTool } from './web-search';
import { LiteratureSearchTool } from './literature-search';

export async function registerToolClasses() {
  // Register tool CLASSES (not instances)
  toolRegistry.registerClass(WebSearchTool);
  toolRegistry.registerClass(LiteratureSearchTool);
  // ... register other tools
}
```

### Getting Tool Metadata

Access metadata without instantiation:

```typescript
// Get all tool metadata
const allMetadata = toolRegistry.getAllMetadata();

// Get specific tool class
const ToolClass = toolRegistry.getClass('web_search');
console.log(ToolClass.toolName);
console.log(ToolClass.toolDescription);
```

### Instantiating Tools On-Demand

Create instances only when LLM calls the tool:

```typescript
// When LLM decides to use a tool
const ToolClass = toolRegistry.getClass(toolName);
if (!ToolClass) {
  throw new Error(`Tool not found: ${toolName}`);
}

// Instantiate with user-specific context
const contextVariables = {
  apiKey: userConfig.apiKey,
  userId: user.id,
  // ... other context
};

const toolInstance = new ToolClass(contextVariables);

// Execute the tool
const result = await toolInstance.execute(input);
```

---

## Advanced Patterns

### Health Checks

Implement custom health checks:

```typescript
export class ExternalAPITool extends BaseTool<...> {
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.contextVariables.apiUrl}/health`,
        { method: 'HEAD', timeout: 5000 }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  // Static health check (no instance needed)
  static async isOnline(context: BaseContextVariables): Promise<boolean> {
    try {
      const response = await fetch(`${context.apiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### Streaming Results

For tools that return large datasets:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // Return iterator for streaming
  return {
    async *stream() {
      for await (const chunk of fetchDataStream()) {
        yield chunk;
      }
    },
    // Also provide complete data
    complete: await fetchAllData(),
  };
}
```

### Caching Results

Cache expensive operations:

```typescript
export class ExpensiveAPITool extends BaseTool<...> {
  private cache = new Map<string, any>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  async execute(input: z.infer<typeof this.inputSchema>) {
    const cacheKey = JSON.stringify(input);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Fetch fresh data
    const data = await this.fetchData(input);

    // Update cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }
}
```

### Retry Logic

Handle transient failures:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.performOperation(input);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Final attempt failed
      }

      console.warn(`Attempt ${attempt} failed, retrying...`);
      await this.sleep(retryDelay * attempt);
    }
  }
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Best Practices

### 1. Keep Tools Focused

Each tool should do one thing well:

```typescript
// ❌ Bad: Tool does too much
class DataTool {
  async execute(input) {
    if (input.action === 'fetch') return this.fetch();
    if (input.action === 'update') return this.update();
    if (input.action === 'delete') return this.delete();
  }
}

// ✅ Good: Separate tools for each action
class FetchDataTool { ... }
class UpdateDataTool { ... }
class DeleteDataTool { ... }
```

### 2. Validate Early

Validate inputs before expensive operations:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // Validate business logic early
  if (input.startDate > input.endDate) {
    throw new Error('Start date must be before end date');
  }

  // Then proceed with expensive operations
  return await this.fetchData(input);
}
```

### 3. Provide Helpful Descriptions

Help the LLM understand when to use your tool:

```typescript
// ❌ Bad: Vague description
static readonly toolDescription = 'Gets data';

// ✅ Good: Specific and informative
static readonly toolDescription =
  'Retrieves brain region data from the EntityCore database. ' +
  'Returns region properties including name, coordinates, volume, ' +
  'and hierarchical relationships. Supports filtering by region type ' +
  'and searching by name or ID.';
```

### 4. Handle Edge Cases

Consider unusual inputs:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // Handle empty results
  const results = await this.search(input.query);
  if (results.length === 0) {
    return {
      success: true,
      results: [],
      message: 'No results found. Try a different query.',
    };
  }

  // Handle partial failures
  const processed = results.map(r => {
    try {
      return this.processResult(r);
    } catch (error) {
      console.warn('Failed to process result:', error);
      return null;
    }
  }).filter(r => r !== null);

  return { success: true, results: processed };
}
```

### 5. Log Appropriately

Log for debugging without cluttering:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  console.log(`[${this.getName()}] Executing with input:`, input);

  try {
    const result = await this.operation();
    console.log(`[${this.getName()}] Success:`, result);
    return result;
  } catch (error) {
    console.error(`[${this.getName()}] Error:`, error);
    throw error;
  }
}
```

### 6. Document Complex Logic

Add comments for non-obvious code:

```typescript
async execute(input: z.infer<typeof this.inputSchema>) {
  // EntityCore API requires region IDs in a specific format
  // Format: "http://api.brain-map.org/api/v2/data/Structure/{id}"
  const formattedId = this.formatRegionId(input.regionId);

  // The API returns nested hierarchies up to 5 levels deep
  // We flatten this to a single array for easier processing
  const hierarchy = await this.fetchHierarchy(formattedId);
  const flattened = this.flattenHierarchy(hierarchy);

  return flattened;
}
```

### 7. Use TypeScript Features

Leverage type safety:

```typescript
// Define result types
interface SearchResult {
  id: string;
  title: string;
  score: number;
}

async execute(input: z.infer<typeof this.inputSchema>): Promise<SearchResult[]> {
  const results: SearchResult[] = await this.search(input.query);

  // TypeScript ensures type safety
  return results.map(r => ({
    id: r.id,
    title: r.title,
    score: r.score,
  }));
}
```

### 8. Test Thoroughly

Write comprehensive tests:

```typescript
describe('MyTool', () => {
  // Test happy path
  it('should work with valid input', async () => { ... });

  // Test edge cases
  it('should handle empty results', async () => { ... });
  it('should handle large datasets', async () => { ... });

  // Test error cases
  it('should throw on invalid input', async () => { ... });
  it('should handle API failures', async () => { ... });

  // Test integration
  it('should work with Vercel AI SDK', async () => { ... });
});
```

---

## Complete Example

Here's a complete, production-ready tool:

```typescript
import { BaseTool, BaseContextVariables } from './base-tool';
import { z } from 'zod';

// Input schema
const BrainRegionSearchInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(200, 'Query too long')
    .describe('Search query for brain regions'),

  limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of results'),

  includeHierarchy: z.boolean().default(false).describe('Include hierarchical relationships'),
});

// Context variables
interface BrainRegionSearchContext extends BaseContextVariables {
  entitycoreUrl: string;
  httpClient: typeof fetch;
}

// Result type
interface BrainRegion {
  id: string;
  name: string;
  acronym: string;
  coordinates: [number, number, number];
  hierarchy?: string[];
}

// Tool implementation
export class BrainRegionSearchTool extends BaseTool<
  typeof BrainRegionSearchInputSchema,
  BrainRegionSearchContext
> {
  // Static metadata
  static readonly toolName = 'search_brain_regions';
  static readonly toolNameFrontend = 'Brain Region Search';
  static readonly toolDescription =
    'Search for brain regions in the EntityCore database. ' +
    'Returns region names, acronyms, coordinates, and optional ' +
    'hierarchical relationships. Useful for finding specific brain ' +
    'areas or exploring brain anatomy.';
  static readonly toolDescriptionFrontend = 'Search for brain regions and explore brain anatomy';
  static readonly toolUtterances = [
    'search brain regions',
    'find brain area',
    'look up brain structure',
    'what is the hippocampus',
  ];

  // Instance properties
  contextVariables: BrainRegionSearchContext;
  inputSchema = BrainRegionSearchInputSchema;

  constructor(contextVariables: BrainRegionSearchContext) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(
    input: z.infer<typeof this.inputSchema>
  ): Promise<{ results: BrainRegion[]; count: number }> {
    console.log(`[${this.getName()}] Searching for: ${input.query}`);

    try {
      // Search for regions
      const regions = await this.searchRegions(input.query, input.limit);

      // Optionally include hierarchy
      if (input.includeHierarchy) {
        await this.enrichWithHierarchy(regions);
      }

      console.log(`[${this.getName()}] Found ${regions.length} results`);

      return {
        results: regions,
        count: regions.length,
      };
    } catch (error) {
      console.error(`[${this.getName()}] Error:`, error);
      throw new Error(`Failed to search brain regions: ${error.message}`);
    }
  }

  private async searchRegions(query: string, limit: number): Promise<BrainRegion[]> {
    const url = `${this.contextVariables.entitycoreUrl}/regions/search`;

    const response = await this.contextVariables.httpClient(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  }

  private async enrichWithHierarchy(regions: BrainRegion[]): Promise<void> {
    await Promise.all(
      regions.map(async (region) => {
        try {
          region.hierarchy = await this.fetchHierarchy(region.id);
        } catch (error) {
          console.warn(`Failed to fetch hierarchy for ${region.id}`);
          region.hierarchy = [];
        }
      })
    );
  }

  private async fetchHierarchy(regionId: string): Promise<string[]> {
    const url = `${this.contextVariables.entitycoreUrl}/regions/${regionId}/hierarchy`;
    const response = await this.contextVariables.httpClient(url);

    if (!response.ok) {
      throw new Error('Failed to fetch hierarchy');
    }

    const data = await response.json();
    return data.hierarchy;
  }

  async isOnline(): Promise<boolean> {
    try {
      const response = await this.contextVariables.httpClient(
        `${this.contextVariables.entitycoreUrl}/health`,
        { method: 'HEAD' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## Checklist for New Tools

Before submitting a new tool, ensure:

- [ ] Extends `BaseTool` with proper type parameters
- [ ] Defines all required static properties (toolName, toolDescription)
- [ ] Has descriptive frontend names and descriptions
- [ ] Includes 3-10 relevant utterances
- [ ] Input schema uses Zod with descriptions
- [ ] Context variables interface is defined
- [ ] Execute method has proper error handling
- [ ] Returns JSON-serializable data
- [ ] Includes health check if using external services
- [ ] Has comprehensive unit tests
- [ ] Has integration tests with Vercel AI SDK
- [ ] Documented with JSDoc comments
- [ ] Registered in tool registry
- [ ] Added to tool index exports

---

## Additional Resources

- [Base Tool Source Code](../src/lib/tools/base-tool.ts)
- [Example Tools](../src/lib/tools/)
- [Tool Tests](../tests/tools/)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Zod Documentation](https://zod.dev)

---

## Support

For questions about tool development:

- Review existing tool implementations in `src/lib/tools/`
- Check test examples in `tests/tools/`
- See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for Python to TypeScript patterns
