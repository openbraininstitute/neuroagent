import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Proxy Verification Test
 *
 * This test makes actual external API calls using ONLY native fetch to verify
 * that mitmproxy is correctly intercepting HTTP/HTTPS traffic.
 *
 * IMPORTANT: Node.js v22.21.0+ and v24.0.0+ support native fetch proxy via NODE_USE_ENV_PROXY
 *
 * Run with:
 * NODE_USE_ENV_PROXY=1 HTTP_PROXY=http://localhost:8080 HTTPS_PROXY=http://localhost:8080 \
 * NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem npm test -- tests/proxy-verification.test.ts
 *
 * You should see requests appear in your mitmweb interface at http://localhost:8081
 *
 * This test uses ONLY native fetch - exactly as production code does.
 * If these requests show up in mitmweb, then ALL production code using fetch will also be intercepted.
 */
describe('Proxy Verification - Native Fetch Only', () => {
  // Run config check once before all tests
  beforeAll(() => {
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const useEnvProxy = process.env.NODE_USE_ENV_PROXY;

    console.log('\n🔍 Proxy Configuration Check:');
    console.log(`   HTTP_PROXY: ${process.env.HTTP_PROXY || 'not set'}`);
    console.log(`   HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'not set'}`);
    console.log(`   NODE_USE_ENV_PROXY: ${useEnvProxy || 'not set'}`);
    console.log(`   NODE_EXTRA_CA_CERTS: ${process.env.NODE_EXTRA_CA_CERTS || 'not set'}`);
    console.log(`   Node.js version: ${process.version}`);
    console.log(`   NO_PROXY: ${process.env.NO_PROXY || 'not set'}`);
    console.log(`   no_proxy: ${process.env.no_proxy || 'not set'}`);

    if (!proxyUrl) {
      console.log('⚠️  No proxy configured - requests will go direct\n');
    } else if (!useEnvProxy) {
      console.log('⚠️  NODE_USE_ENV_PROXY not set - native fetch will NOT use proxy\n');
      console.log('   Set NODE_USE_ENV_PROXY=1 to enable proxy for native fetch\n');
    } else {
      console.log(`✅ Proxy configured: ${proxyUrl}\n`);
    }
  });

  it('should route native fetch GET through proxy (httpbin) - with unique timestamp', async () => {
    // Add timestamp to make each request unique and easier to spot in mitmweb
    const timestamp = Date.now();
    const url = `https://httpbin.org/get?test=native-fetch-proxy&timestamp=${timestamp}`;

    console.log(`\n🌐 Making request to: ${url}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`📡 This should appear in mitmweb at http://localhost:8081`);

    const response = await fetch(url);

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.args).toHaveProperty('test', 'native-fetch-proxy');
    expect(data.args).toHaveProperty('timestamp', timestamp.toString());

    console.log('✅ Native fetch GET to httpbin.org successful');
    console.log(`📡 Look for timestamp ${timestamp} in mitmweb`);
  });

  it('should route native fetch POST through proxy - with unique body', async () => {
    const timestamp = Date.now();
    const testData = { test: 'native-fetch-post', timestamp };

    console.log(`\n🌐 Making POST request to: https://httpbin.org/post`);
    console.log(`📦 Body: ${JSON.stringify(testData)}`);
    console.log(`📡 This should appear in mitmweb at http://localhost:8081`);

    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.json).toHaveProperty('test', 'native-fetch-post');
    expect(data.json).toHaveProperty('timestamp', timestamp);

    console.log('✅ Native fetch POST to httpbin.org successful');
    console.log(`📡 Look for POST with timestamp ${timestamp} in mitmweb`);
  });
});
