# Test Performance Optimizations

## Overview

This document tracks performance optimizations made to the test suite to reduce execution time while maintaining test quality.

## Optimizations Applied

### 1. Console Output Suppression (vitest.config.ts)

**Change:** Added `silent: true` to Vitest configuration

**Impact:**
- Suppresses console.log, console.error, console.warn during tests
- Cleaner test output focused on results
- Slight performance improvement from reduced I/O

**To disable for debugging:**
```typescript
// In vitest.config.ts, set:
silent: false
```

### 2. Reduced Artificial Delays

Identified and reduced unnecessary `setTimeout` delays in tests:

| File | Original Delay | New Delay | Reason |
|------|---------------|-----------|---------|
| `tests/db/integration.test.ts` | 10ms | 1ms | Timestamp change detection |
| `tests/tools/tool-health-checks.property.test.ts` | 50ms | 5ms | Concurrent health check simulation |
| `tests/e2e/error-scenarios.test.ts` | 50ms | 5ms | Slow response simulation |
| `tests/e2e/conversation-flow.test.ts` | 100ms | 10ms | Timeout simulation |
| `tests/middleware/path-prefix.test.ts` | 10ms | 1ms | Async middleware simulation |

**Total time saved:** ~200ms per test run from these changes alone

### 3. Inherently Slow Tests

Some tests are legitimately slow due to their nature:

#### Database Migration Tests (~8 seconds)
- `tests/db/migration-validation.property.test.ts`
- `tests/db/migration-rollback.property.test.ts`

**Why slow:**
- Spawn `npx prisma migrate deploy` processes via `execSync`
- Create/apply/rollback actual database migrations
- Capture and compare full database schema state
- Run multiple property-based test iterations

**Cannot be optimized without:**
- Mocking Prisma CLI (defeats the purpose of integration testing)
- Reducing test coverage (not recommended)
- Using in-memory database (PostgreSQL-specific features needed)

#### Property-Based Tests (~3-4 seconds)
- `tests/agents/tool-call-response-handling.property.test.ts`
- `tests/middleware/rate-limit-headers.property.test.ts`
- `tests/tools/tool-health-checks.property.test.ts`

**Why slow:**
- Run 100 iterations per property test (configured in vitest.config.ts)
- Generate random test data for each iteration
- Perform database operations for each iteration

**Can be optimized by:**
- Reducing `numRuns` in vitest.config.ts (trade-off: less thorough testing)
- Currently set to 100 (minimum recommended for property tests)

## Current Performance

**Total test suite duration:** ~29-30 seconds

**Breakdown:**
- Transform: ~340ms
- Setup: ~140ms
- Collect: ~2.5s
- Tests: ~20s
- Environment: ~4ms
- Prepare: ~1.2s

**Test distribution:**
- 635 passing tests
- 148 todo tests
- 4 skipped test files (require external services)

## Recommendations

### For Development
Keep current settings - tests are reasonably fast for development workflow.

### For CI/CD
Consider:
1. **Parallel execution:** Run test files in parallel (currently disabled due to database race conditions)
2. **Test sharding:** Split tests across multiple CI workers
3. **Selective testing:** Run only affected tests on PRs
4. **Caching:** Cache node_modules and Prisma client generation

### Not Recommended
- Reducing property test iterations below 100
- Skipping migration validation tests
- Mocking database operations in integration tests

## Monitoring

Track test performance over time:

```bash
# Run tests with timing
npm test 2>&1 | grep "Duration"

# Run specific slow test
npm test -- tests/db/migration-validation.property.test.ts
```

## Future Optimizations

Potential areas for improvement:

1. **Database fixtures:** Pre-populate test database to reduce setup time
2. **Shared test context:** Reuse database connections across tests
3. **Lazy loading:** Load heavy dependencies only when needed
4. **Test parallelization:** Investigate safe parallel execution strategies
5. **Snapshot testing:** Use snapshots for schema validation instead of full comparison

## Related Files

- `vitest.config.ts` - Test configuration
- `tests/setup.ts` - Global test setup
- `backend-ts/docs/TEST-MOCKING-STRATEGY.md` - Mocking guidelines
