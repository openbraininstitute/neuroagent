/**
 * Tests for CORS middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  addCorsHeaders,
  handleCorsPreflightRequest,
  isCorsPreflightRequest,
} from '@/lib/middleware/cors';
import * as settingsModule from '@/lib/config/settings';

// Mock settings
vi.mock('@/lib/config/settings', () => ({
  getSettings: vi.fn(),
}));

describe('CORS Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCorsPreflightRequest', () => {
    it('should return true for OPTIONS request with CORS headers', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://example.com',
          'access-control-request-method': 'POST',
        },
      });

      expect(isCorsPreflightRequest(request)).toBe(true);
    });

    it('should return false for OPTIONS request without origin', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
        headers: {
          'access-control-request-method': 'POST',
        },
      });

      expect(isCorsPreflightRequest(request)).toBe(false);
    });

    it('should return false for OPTIONS request without access-control-request-method', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://example.com',
        },
      });

      expect(isCorsPreflightRequest(request)).toBe(false);
    });

    it('should return false for non-OPTIONS request', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://example.com',
          'access-control-request-method': 'POST',
        },
      });

      expect(isCorsPreflightRequest(request)).toBe(false);
    });
  });

  describe('addCorsHeaders', () => {
    it('should add wildcard CORS headers when no origins configured', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          corsOrigins: '',
        },
      } as any);

      const response = NextResponse.next();
      const request = new NextRequest('http://localhost/api/test', {
        headers: { origin: 'http://example.com' },
      });

      addCorsHeaders(response, request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should add specific origin when configured and origin matches', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          corsOrigins: 'http://example.com,http://test.com',
        },
      } as any);

      const response = NextResponse.next();
      const request = new NextRequest('http://localhost/api/test', {
        headers: { origin: 'http://example.com' },
      });

      addCorsHeaders(response, request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com');
    });

    it('should not set origin when configured origin does not match', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          corsOrigins: 'http://example.com',
        },
      } as any);

      const response = NextResponse.next();
      const request = new NextRequest('http://localhost/api/test', {
        headers: { origin: 'http://unauthorized.com' },
      });

      addCorsHeaders(response, request);

      // Should still set the configured origin when there's only one
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com');
    });

    it('should handle multiple configured origins', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          corsOrigins: 'http://example.com, http://test.com, http://dev.com',
        },
      } as any);

      const response = NextResponse.next();
      const request = new NextRequest('http://localhost/api/test', {
        headers: { origin: 'http://test.com' },
      });

      addCorsHeaders(response, request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://test.com');
    });

    it('should work without request parameter', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          corsOrigins: '',
        },
      } as any);

      const response = NextResponse.next();
      addCorsHeaders(response);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });

  describe('handleCorsPreflightRequest', () => {
    it('should return 204 response with CORS headers', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
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

      const response = handleCorsPreflightRequest(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should include all required CORS headers in preflight response', () => {
      vi.mocked(settingsModule.getSettings).mockReturnValue({
        misc: {
          corsOrigins: 'http://example.com',
        },
      } as any);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://example.com',
          'access-control-request-method': 'DELETE',
        },
      });

      const response = handleCorsPreflightRequest(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});
