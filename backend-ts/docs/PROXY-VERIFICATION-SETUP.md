# Proxy Verification Setup for Test Cost Safety

This document explains how to verify that tests are not making real external API calls using mitmproxy.

## Problem

Tests should never make real API calls to external services (OpenAI, OpenRouter, etc.) because:
- It costs money (LLM API calls are expensive)
- It's slow and unreliable
- It can hit rate limits
- It makes tests non-deterministic

## Solution

Use mitmproxy to intercept all HTTP/HTTPS traffic and verify that only expected test requests are made.

## Prerequisites

1. **Node.js v24+** (or v25+) - Required for native fetch proxy support
2. **mitmproxy** installed and running

### Install mitmproxy

```bash
# macOS
brew install mitmproxy

# Or using pip
pip install mitmproxy
```

### Upgrade Node.js (if needed)

```bash
# Check current version
node --version

# If < v24, upgrade using Homebrew
brew upgrade node
```

## Running Proxy Verification

### Step 1: Start mitmweb

```bash
mitmweb
```

This starts:
- Proxy server on `http://localhost:8080`
- Web interface on `http://localhost:8081`

### Step 2: Run tests with proxy

```bash
cd backend-ts

NODE_USE_ENV_PROXY=1 \
HTTP_PROXY=http://localhost:8080 \
HTTPS_PROXY=http://localhost:8080 \
NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem \
NO_PROXY="" \
no_proxy="" \
npm test
```

### Step 3: Check mitmweb interface

Open http://localhost:8081 in your browser.

**Expected result:** You should see **only 3 requests**:
1. `GET httpbin.org/get?test=native-fetch-proxy&timestamp=...`
2. `GET api.github.com/zen` (with User-Agent: `neuroagent-test-...`)
3. `POST httpbin.org/post`

These are from `tests/proxy-verification.test.ts` which intentionally makes real API calls to verify the proxy is working.

**If you see any other requests** (especially to `openai.com`, `openrouter.ai`, `api.github.com`, etc.), those tests are NOT properly mocked and need to be fixed.

## How It Works

### Node.js v24+ Native Fetch Proxy Support

Node.js v24 and later support native proxy configuration for `fetch()` via the `NODE_USE_ENV_PROXY` environment variable:

- `NODE_USE_ENV_PROXY=1` - Enables proxy support for native fetch
- `HTTP_PROXY` / `HTTPS_PROXY` - Proxy server URL
- `NODE_EXTRA_CA_CERTS` - Path to mitmproxy's CA certificate (for HTTPS)
- `NO_PROXY` / `no_proxy` - Set to empty string to ensure all requests go through proxy

### Why Node.js v23 Didn't Work

Node.js v23 does NOT have native fetch proxy support. The feature was added in v24.0.0+ and v22.21.0+, but was explicitly excluded from v23 (`dont-land-on-v23.x` tag).

## Critical Mocks

The following mocks are essential to prevent real API calls:

### 1. Tool Filtering / Complexity Estimation

**File:** `tests/api/chat-streamed.test.ts`

```typescript
vi.mock('@/lib/utils/tool-filtering', () => ({
  filterToolsAndModelByConversation: vi.fn().mockResolvedValue({
    filteredTools: [],
    model: 'openai/gpt-4',
    reasoning: 'low',
  }),
}));
```

**Why:** This function calls `generateObject()` from the AI SDK which makes real LLM API calls to OpenRouter for tool selection and complexity estimation.

### 2. AI SDK (Vercel AI SDK)

**File:** All test files using `AgentsRoutine`

```typescript
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
  generateText: vi.fn(),
  // ... other AI SDK functions
}));
```

**Why:** The AI SDK makes real API calls to LLM providers (OpenAI, OpenRouter).

### 3. OpenRouter Models API

**File:** `tests/api/models.test.ts`

```typescript
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => mockOpenRouterResponse,
  });
});
```

**Why:** The `/api/qa/models` endpoint fetches the list of available models from `https://openrouter.ai/api/v1/models`.

## Troubleshooting

### "I don't see any requests in mitmweb"

1. Verify mitmweb is running: `http://localhost:8081`
2. Check Node.js version: `node --version` (must be v24+)
3. Verify environment variables are set correctly
4. Check that `NO_PROXY` and `no_proxy` are empty strings

### "I see requests but they're not from my tests"

- Clear mitmweb history before running tests
- Run only the proxy verification test first: `npm test -- tests/proxy-verification.test.ts`

### "Tests fail with certificate errors"

- Ensure `NODE_EXTRA_CA_CERTS` points to the correct certificate path
- Default path: `~/.mitmproxy/mitmproxy-ca-cert.pem`
- Regenerate certificate if needed: `mitmproxy` (run once to generate)

## Cost Savings

By ensuring all tests are properly mocked:
- **Estimated savings:** $500-1000/year
- **Test execution time:** 10x faster
- **Reliability:** No rate limiting or network issues

## Maintenance

When adding new tests that interact with external APIs:

1. **Always mock external calls** - Use `vi.mock()` or `vi.fn()`
2. **Run proxy verification** - Verify no unexpected requests appear in mitmweb
3. **Document the mock** - Explain why the mock is needed

## References

- [Node.js Proxy Support PR](https://github.com/nodejs/node/pull/57165)
- [mitmproxy Documentation](https://docs.mitmproxy.org/)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
