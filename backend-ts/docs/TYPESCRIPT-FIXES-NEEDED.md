# TypeScript Fixes Needed

This document lists all TypeScript compilation errors that need to be fixed before production deployment, organized by priority.

## Priority 1: Critical Runtime Issues (Must Fix)

### 1.1 Prisma Enum Case Mismatch

**File:** `src/lib/db/index.ts`
**Lines:** 17-20
**Issue:** Importing enums with wrong case (PascalCase vs lowercase)

```typescript
// Current (WRONG):
export {
  Entity, // Should be: entity
  Task, // Should be: task
  TokenType, // Should be: tokentype
  ReasoningLevels, // Should be: reasoninglevels
} from '@prisma/client';

// Fix:
export {
  entity as Entity,
  task as Task,
  tokentype as TokenType,
  reasoninglevels as ReasoningLevels,
} from '@prisma/client';
```

**Impact:** High - Affects all code using these enums
**Estimated Time:** 5 minutes

### 1.2 Missing ToolCall.result Property

**File:** `src/app/api/threads/[thread_id]/messages/route.ts`
**Lines:** 457 (2 errors)
**Issue:** Accessing non-existent `result` property on ToolCall

```typescript
// Current (WRONG):
result: tc.result ? JSON.parse(tc.result) : null,

// Fix: Remove or use correct property
// Option 1: Remove if not needed
// Option 2: Store result in tool call arguments or separate table
```

**Impact:** High - Breaks message retrieval API
**Estimated Time:** 15 minutes (need to verify data model)

### 1.3 Possibly Undefined Array Access

**File:** `src/app/api/threads/[thread_id]/messages/route.ts`
**Line:** 426
**Issue:** Accessing array element without null check

```typescript
// Current (WRONG):
createdAt: reversedMessages[reversedMessages.length - 1].creationDate.toISOString(),

// Fix:
createdAt: reversedMessages.length > 0
  ? reversedMessages[reversedMessages.length - 1].creationDate.toISOString()
  : new Date().toISOString(),
```

**Impact:** Medium - Could cause runtime error with empty arrays
**Estimated Time:** 5 minutes

### 1.4 MCPDynamicTool Missing contextVariables

**File:** `src/lib/mcp/client.ts`
**Line:** 239
**Issue:** Class doesn't implement required abstract member

```typescript
// Current (WRONG):
class MCPDynamicTool extends BaseTool<typeof inputSchema> {
  // Missing contextVariables implementation
}

// Fix:
class MCPDynamicTool extends BaseTool<typeof inputSchema> {
  contextVariables = {}; // Add this line

  // ... rest of implementation
}
```

**Impact:** High - MCP tools won't work
**Estimated Time:** 5 minutes

## Priority 2: Type Safety Issues (Should Fix)

### 2.1 Next.js 15 Params Pattern

**Files:** Multiple test files
**Issue:** Tests use old params pattern (object instead of Promise)

```typescript
// Current (WRONG):
const response = await getThread(request, {
  params: { thread_id: testThreadId },
});

// Fix:
const response = await getThread(request, {
  params: Promise.resolve({ thread_id: testThreadId }),
});
```

**Affected Files:**

- `tests/api/threads.test.ts` (7 errors)

**Impact:** Medium - Tests work but type-unsafe
**Estimated Time:** 10 minutes

### 2.2 Request vs NextRequest in Tests

**Files:** `tests/api/question-suggestions.test.ts`, `tests/api/storage.test.ts`
**Issue:** Using `Request` instead of `NextRequest` in test mocks

```typescript
// Current (WRONG):
const request = new Request('http://localhost/api/...');
const response = await POST(request);

// Fix: Cast to NextRequest or use proper mock
const request = new Request('http://localhost/api/...') as any as NextRequest;
const response = await POST(request);
```

**Impact:** Low - Tests work but type-unsafe
**Estimated Time:** 15 minutes

### 2.3 Null Assignment to Non-Nullable Types

**Files:** Multiple test files
**Issue:** Mocking functions to return null when type expects object

```typescript
// Current (WRONG):
vi.mocked(validateAuth).mockResolvedValueOnce(null);

// Fix:
vi.mocked(validateAuth).mockResolvedValueOnce(null as any);
// Or update function signature to allow null
```

**Impact:** Low - Tests work but type-unsafe
**Estimated Time:** 10 minutes

### 2.4 OpenRouter Provider Type Mismatch

**File:** `tests/integration/llm-providers.test.ts`
**Lines:** 180, 223
**Issue:** OpenRouter provider has incompatible type with Vercel AI SDK

```typescript
// Current (WRONG):
const result = await streamText({
  model, // OpenRouterChatLanguageModel
  // ...
});

// Fix: Cast to compatible type
const result = await streamText({
  model: model as any as LanguageModelV1,
  // ...
});
```

**Impact:** Low - Tests work but type-unsafe
**Estimated Time:** 5 minutes

### 2.5 Reasoning Level Case Mismatch

**File:** `tests/e2e/conversation-flow.test.ts`
**Lines:** 124, 376, 480, 828
**Issue:** Using lowercase 'low' instead of uppercase 'LOW'

```typescript
// Current (WRONG):
reasoning: 'low',

// Fix:
reasoning: 'LOW',
```

**Impact:** Low - Tests work but type-unsafe
**Estimated Time:** 5 minutes

## Priority 3: Code Quality Issues (Nice to Fix)

### 3.1 Unused Variables and Imports

**Files:** Multiple test files
**Issue:** Declared but never used

**Examples:**

- `tests/agents/parallel-tool-execution.test.ts` - `prisma`, `MockTool`, `routine`
- `tests/agents/routine.test.ts` - `Entity`
- `tests/db/integration.test.ts` - `beforeEach`
- `tests/mcp/client.test.ts` - `beforeEach`, `afterEach`
- Many more...

**Fix:** Remove unused declarations

**Impact:** None - Just code cleanliness
**Estimated Time:** 30 minutes

### 3.2 Unused Interface Definitions

**Files:** `src/app/api/tools/route.ts`, `src/lib/tools/index.ts`
**Issue:** Interfaces defined but never used

```typescript
// Current (WRONG):
interface ToolMetadataDetailed extends ToolMetadata { ... }
interface InputSchema { ... }

// Fix: Remove if truly unused, or use them
```

**Impact:** None - Just code cleanliness
**Estimated Time:** 10 minutes

### 3.3 Possibly Undefined in Tests

**Files:** Multiple test files
**Issue:** Accessing array elements without null checks in tests

```typescript
// Current (WRONG):
expect(messages[0].entity).toBe('USER');

// Fix:
expect(messages[0]?.entity).toBe('USER');
// Or add assertion: expect(messages.length).toBeGreaterThan(0);
```

**Impact:** Low - Tests would fail if arrays empty
**Estimated Time:** 30 minutes

### 3.4 Process.env Property Access

**File:** `tests/proxy-verification.test.ts`
**Issue:** Accessing process.env properties without bracket notation

```typescript
// Current (WRONG):
const proxyUrl = process.env.HTTP_PROXY;

// Fix:
const proxyUrl = process.env['HTTP_PROXY'];
```

**Impact:** None - Works but TypeScript prefers bracket notation
**Estimated Time:** 5 minutes

### 3.5 Read-only Property Assignment

**File:** `tests/agents/error-handling.test.ts`
**Lines:** 93, 125
**Issue:** Trying to assign to read-only NODE_ENV

```typescript
// Current (WRONG):
process.env.NODE_ENV = 'development';

// Fix: Use vi.stubEnv or similar
vi.stubEnv('NODE_ENV', 'development');
```

**Impact:** Low - May not work as intended
**Estimated Time:** 5 minutes

## Summary

**Total Errors:** 132
**Priority 1 (Must Fix):** 4 issues (~30 minutes)
**Priority 2 (Should Fix):** 5 categories (~55 minutes)
**Priority 3 (Nice to Fix):** 5 categories (~80 minutes)

**Total Estimated Time:** 2-3 hours to fix all issues

## Recommended Approach

1. **Phase 1 (30 min):** Fix Priority 1 issues
   - Enum case mismatch
   - Missing properties
   - Null checks
   - MCP tool context variables

2. **Phase 2 (1 hour):** Fix Priority 2 issues
   - Next.js 15 patterns
   - Type casts in tests
   - Reasoning level cases

3. **Phase 3 (1 hour):** Fix Priority 3 issues
   - Remove unused code
   - Add null checks in tests
   - Clean up minor issues

4. **Verify:** Run `npm run type-check` after each phase

## After Fixing

Once all TypeScript errors are resolved:

1. Run full test suite: `npm test`
2. Run type check: `npm run type-check`
3. Run linter: `npm run lint`
4. Build for production: `npm run build`
5. Manual testing with real services
6. Integration testing with frontend
