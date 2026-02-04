/**
 * Tests for Path Prefix stripping middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  shouldStripPrefix,
  stripPathPrefix,
  withPathPrefixStripping,
} from '@/lib/middleware/path-prefix';
import * as settingsModule from '@/lib/config/settings';

// Mock settings
vi.mock('@/lib/config/settings', () => ({
  getSettings: vi.fn(),
}));

describe('Path Prefix Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldStripPrefix', () => {
    it('should return true when path starts with prefix', () => {
      expect(shouldStripPrefix('/api/v1/test', '/api/v1')).toBe(true);
    });

    it('should return false when path does not start with prefix', () => {
      expect(shouldStripPrefix('/api/test', '/api/v1')).toBe(false);
    });

    it('should return false when prefix is empty', () => {
      expect(shouldStripPrefix('/api/test', '')).toBe(false);
    });

    it('should return false for Next.js internal routes', () => {
      expect(shouldStripPrefix('/_next/static/test', '/api')).toBe(false);
      expect(shouldStripPrefix('/api/_next/test', '/api')).toBe(false);
    });

    it('should return true for API routes with prefix', () => {
      expect(shouldStripPrefix('/myapp/api/test', '/myapp')).toBe(true);
    });

    it('should handle trailing slashes correctly', () => {
      expect(shouldStripPrefix('/prefix/path', '/prefix')).toBe(true);
      expect(shouldStripPrefix('/prefix/', '/prefix')).toBe(true);
    });
  });

  describe('stripPathPrefix', () => {
    it('should strip prefix from request path', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp/api/test');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/api/test');
    });

    it('should return original request when no prefix configured', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/api/test');
      expect(strippedRequest).toBe(request);
    });

    it('should return original request when path does not start with prefix', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/api/test');
      expect(strippedRequest).toBe(request);
    });

    it('should not strip prefix from Next.js internal routes', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/_next/static/test');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/_next/static/test');
      expect(strippedRequest).toBe(request);
    });

    it('should preserve query parameters', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp/api/test?foo=bar&baz=qux');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/api/test');
      expect(strippedRequest.nextUrl.searchParams.get('foo')).toBe('bar');
      expect(strippedRequest.nextUrl.searchParams.get('baz')).toBe('qux');
    });

    it('should preserve request method', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp/api/test', {
        method: 'POST',
      });
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.method).toBe('POST');
    });

    it('should preserve request headers', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp/api/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
      });
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(strippedRequest.headers.get('Authorization')).toBe('Bearer token123');
    });

    it('should handle root path after stripping', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const request = new NextRequest('http://localhost/myapp');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/');
    });

    it('should handle multiple path segments', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/api/v1',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/v1/users/123/profile');
      const strippedRequest = stripPathPrefix(request);

      expect(strippedRequest.nextUrl.pathname).toBe('/users/123/profile');
    });
  });

  describe('withPathPrefixStripping', () => {
    it('should wrap middleware with path prefix stripping', async () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const mockMiddleware = vi.fn((req: NextRequest) => {
        return NextResponse.json({ path: req.nextUrl.pathname });
      });

      const wrappedMiddleware = withPathPrefixStripping(mockMiddleware);
      const request = new NextRequest('http://localhost/myapp/api/test');

      await wrappedMiddleware(request);

      expect(mockMiddleware).toHaveBeenCalledTimes(1);
      const calledRequest = mockMiddleware.mock.calls[0]?.[0];
      expect(calledRequest?.nextUrl.pathname).toBe('/api/test');
    });

    it('should pass through when no prefix configured', async () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '',
        },
      } as any);

      const mockMiddleware = vi.fn((req: NextRequest) => {
        return NextResponse.json({ path: req.nextUrl.pathname });
      });

      const wrappedMiddleware = withPathPrefixStripping(mockMiddleware);
      const request = new NextRequest('http://localhost/api/test');

      await wrappedMiddleware(request);

      expect(mockMiddleware).toHaveBeenCalledTimes(1);
      const calledRequest = mockMiddleware.mock.calls[0]?.[0];
      expect(calledRequest?.nextUrl.pathname).toBe('/api/test');
    });

    it('should work with async middleware', async () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          applicationPrefix: '/myapp',
        },
      } as any);

      const mockMiddleware = vi.fn(async (req: NextRequest) => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Reduced from 10ms to 1ms
        return NextResponse.json({ path: req.nextUrl.pathname });
      });

      const wrappedMiddleware = withPathPrefixStripping(mockMiddleware);
      const request = new NextRequest('http://localhost/myapp/api/test');

      const response = await wrappedMiddleware(request);

      expect(mockMiddleware).toHaveBeenCalledTimes(1);
      expect(response).toBeDefined();
    });
  });
});
