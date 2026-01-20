/**
 * Tests for Request ID correlation middleware
 */

import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateRequestId,
  getOrGenerateRequestId,
  addRequestIdHeader,
  createResponseWithRequestId,
  REQUEST_ID_HEADER,
} from '@/lib/middleware/request-id';

describe('Request ID Middleware', () => {
  describe('generateRequestId', () => {
    it('should generate a valid UUID v4', () => {
      const requestId = generateRequestId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      const id3 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('getOrGenerateRequestId', () => {
    it('should return existing request ID from header', () => {
      const existingId = 'existing-request-id-123';
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          [REQUEST_ID_HEADER]: existingId,
        },
      });

      const requestId = getOrGenerateRequestId(request);

      expect(requestId).toBe(existingId);
    });

    it('should generate new request ID when header is missing', () => {
      const request = new NextRequest('http://localhost/api/test');

      const requestId = getOrGenerateRequestId(request);

      expect(requestId).toBeDefined();
      expect(requestId.length).toBeGreaterThan(0);
      // Should be a valid UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });

    it('should generate new request ID when header is empty', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          [REQUEST_ID_HEADER]: '',
        },
      });

      const requestId = getOrGenerateRequestId(request);

      expect(requestId).toBeDefined();
      expect(requestId.length).toBeGreaterThan(0);
    });
  });

  describe('addRequestIdHeader', () => {
    it('should add request ID header to response', () => {
      const request = new NextRequest('http://localhost/api/test');
      const response = NextResponse.next();

      addRequestIdHeader(response, request);

      const requestId = response.headers.get(REQUEST_ID_HEADER);
      expect(requestId).toBeDefined();
      expect(requestId).not.toBe('');
    });

    it('should preserve existing request ID from request', () => {
      const existingId = 'existing-request-id-456';
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          [REQUEST_ID_HEADER]: existingId,
        },
      });
      const response = NextResponse.next();

      addRequestIdHeader(response, request);

      expect(response.headers.get(REQUEST_ID_HEADER)).toBe(existingId);
    });

    it('should return the same response object', () => {
      const request = new NextRequest('http://localhost/api/test');
      const response = NextResponse.next();

      const result = addRequestIdHeader(response, request);

      expect(result).toBe(response);
    });
  });

  describe('createResponseWithRequestId', () => {
    it('should create response with request ID header', () => {
      const request = new NextRequest('http://localhost/api/test');
      const body = JSON.stringify({ message: 'test' });

      const response = createResponseWithRequestId(body, { status: 200 }, request);

      expect(response.status).toBe(200);
      expect(response.headers.get(REQUEST_ID_HEADER)).toBeDefined();
    });

    it('should preserve existing request ID from request', () => {
      const existingId = 'existing-request-id-789';
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          [REQUEST_ID_HEADER]: existingId,
        },
      });

      const response = createResponseWithRequestId(null, { status: 204 }, request);

      expect(response.status).toBe(204);
      expect(response.headers.get(REQUEST_ID_HEADER)).toBe(existingId);
    });

    it('should work with null body', () => {
      const request = new NextRequest('http://localhost/api/test');

      const response = createResponseWithRequestId(null, { status: 204 }, request);

      expect(response.status).toBe(204);
      expect(response.headers.get(REQUEST_ID_HEADER)).toBeDefined();
    });

    it('should work with undefined init', () => {
      const request = new NextRequest('http://localhost/api/test');
      const body = 'test body';

      const response = createResponseWithRequestId(body, undefined, request);

      expect(response.status).toBe(200); // Default status
      expect(response.headers.get(REQUEST_ID_HEADER)).toBeDefined();
    });
  });

  describe('REQUEST_ID_HEADER constant', () => {
    it('should be X-Request-ID', () => {
      expect(REQUEST_ID_HEADER).toBe('X-Request-ID');
    });
  });
});
