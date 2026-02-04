/**
 * Tests for Tools API Route
 *
 * Tests the /api/tools endpoint for listing available tools with basic metadata.
 * Matches Python backend format.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/tools/route';
import { toolRegistry } from '@/lib/tools';
import { NextRequest } from 'next/server';

// Mock authentication
vi.mock('@/lib/middleware/auth', () => ({
  validateAuth: vi.fn().mockResolvedValue({
    sub: 'test-user-id',
    email: 'test@example.com',
    groups: [],
  }),
  AuthenticationError: class AuthenticationError extends Error {},
}));

describe('GET /api/tools', () => {
  beforeEach(() => {
    // Clear tool registry before each test
    toolRegistry.clear();
  });

  it('should return list of tools with basic metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/tools', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should include only name and name_frontend fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/tools', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    if (data.length > 0) {
      const tool = data[0];
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('name_frontend');
      // Should NOT have other fields
      expect(tool).not.toHaveProperty('description');
      expect(tool).not.toHaveProperty('schema');
      expect(tool).not.toHaveProperty('is_online');
    }
  });

  it('should require authentication', async () => {
    const { validateAuth, AuthenticationError } = await import('@/lib/middleware/auth');
    vi.mocked(validateAuth).mockRejectedValueOnce(new AuthenticationError('Unauthorized'));

    const request = new NextRequest('http://localhost:3000/api/tools');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should match Python backend format', async () => {
    const request = new NextRequest('http://localhost:3000/api/tools', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    // Should be a plain array, not wrapped in an object
    expect(Array.isArray(data)).toBe(true);

    // Each item should have exactly the fields from Python ToolMetadata
    if (data.length > 0) {
      const tool = data[0];
      const keys = Object.keys(tool);
      expect(keys).toEqual(['name', 'name_frontend']);
    }
  });
});
