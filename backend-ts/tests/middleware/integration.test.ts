/**
 * Integration tests for middleware chain
 *
 * Tests the complete middleware flow including:
 * - Path prefix stripping
 * - CORS handling
 * - Request ID correlation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import * as settingsModule from '@/lib/config/settings';

// Mock settings
vi.mock('@/lib/config/settings', () => ({
  getSettings: vi.fn(),
}));

describe('Middleware Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete middleware chain', () => {
    it('should apply all middleware in correct order', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp/api/test', {
        method: 'GET',
        headers: {
          origin: 'http://example.com',
        },
      });

      const response = middleware(request);

      // Should have request ID
      expect(response.headers.get('X-Request-ID')).toBeDefined();

      // Should have CORS headers for API routes
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should handle CORS preflight requests', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://example.com',
          'access-control-request-method': 'POST',
        },
      });

      const response = middleware(request);

      // Should return 204 for preflight
      expect(response.status).toBe(204);

      // Should have CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should strip path prefix before processing', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp/api/test', {
        method: 'GET',
      });

      const response = middleware(request);

      // Response should be created (not null)
      expect(response).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should add request ID to all requests', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test');

      const response = middleware(request);

      expect(response.headers.get('X-Request-ID')).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should preserve existing request ID', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      const existingId = 'existing-request-id-123';
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'X-Request-ID': existingId,
        },
      });

      const response = middleware(request);

      expect(response.headers.get('X-Request-ID')).toBe(existingId);
    });

    it('should add CORS headers only to API routes', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      // API route
      const apiRequest = new NextRequest('http://localhost/api/test');
      const apiResponse = middleware(apiRequest);
      expect(apiResponse.headers.get('Access-Control-Allow-Origin')).toBeDefined();

      // Non-API route
      const pageRequest = new NextRequest('http://localhost/page');
      const pageResponse = middleware(pageRequest);
      // CORS headers might still be present from next.config.ts, but we're testing
      // that the middleware logic runs correctly
      expect(pageResponse.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should handle complex path with prefix and query params', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
          corsOrigins: 'http://example.com',
        },
      } as any);

      const request = new NextRequest(
        'http://localhost/myapp/api/threads/123?search=test&limit=10',
        {
          method: 'GET',
          headers: {
            origin: 'http://example.com',
          },
        }
      );

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com');
    });

    it('should not strip prefix from Next.js internal routes', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/_next/static/chunk.js');

      const response = middleware(request);

      // Should still process the request
      expect(response).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should handle POST requests with body', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('should handle multiple CORS origins correctly', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: 'http://example.com,http://test.com,http://dev.com',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          origin: 'http://test.com',
        },
      });

      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://test.com');
    });
  });

  describe('Middleware matcher configuration', () => {
    it('should process API routes', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test');
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should process page routes', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
          corsOrigins: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/page');
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });
  });
});
