/**
 * Tests for authentication middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateAuth,
  validateAuthOptional,
  validateProject,
  validateVirtualLabAccess,
  validateProjectAccess,
  AuthenticationError,
  AuthorizationError,
} from '@/lib/middleware/auth';

// Mock the settings module
vi.mock('@/lib/config/settings', () => ({
  getSettings: vi.fn(() => ({
    keycloak: {
      issuer: 'https://example.com/auth/realms/test',
      userInfoEndpoint: 'https://example.com/auth/realms/test/protocol/openid-connect/userinfo',
    },
  })),
}));

describe('Authentication Middleware', () => {
  describe('validateVirtualLabAccess', () => {
    it('should allow access when user belongs to virtual lab', () => {
      const groups = ['/vlab/abc-123-def', '/other/group'];
      expect(() => validateVirtualLabAccess(groups, 'abc-123-def')).not.toThrow();
    });

    it('should deny access when user does not belong to virtual lab', () => {
      const groups = ['/vlab/other-vlab', '/other/group'];
      expect(() => validateVirtualLabAccess(groups, 'abc-123-def')).toThrow(AuthorizationError);
      expect(() => validateVirtualLabAccess(groups, 'abc-123-def')).toThrow(
        'User does not belong to the virtual-lab'
      );
    });

    it('should deny access when groups array is empty', () => {
      const groups: string[] = [];
      expect(() => validateVirtualLabAccess(groups, 'abc-123-def')).toThrow(AuthorizationError);
    });
  });

  describe('validateProjectAccess', () => {
    it('should allow access when user belongs to project', () => {
      const groups = ['/proj/abc-123-def/proj-456-ghi', '/other/group'];
      expect(() => validateProjectAccess(groups, 'abc-123-def', 'proj-456-ghi')).not.toThrow();
    });

    it('should deny access when user does not belong to project', () => {
      const groups = ['/proj/abc-123-def/other-project', '/other/group'];
      expect(() => validateProjectAccess(groups, 'abc-123-def', 'proj-456-ghi')).toThrow(
        AuthorizationError
      );
      expect(() => validateProjectAccess(groups, 'abc-123-def', 'proj-456-ghi')).toThrow(
        'User does not belong to the project'
      );
    });

    it('should deny access when groups array is empty', () => {
      const groups: string[] = [];
      expect(() => validateProjectAccess(groups, 'abc-123-def', 'proj-456-ghi')).toThrow(
        AuthorizationError
      );
    });
  });

  describe('validateProject', () => {
    it('should validate virtual lab access when only vlabId is provided', () => {
      const groups = ['/vlab/abc-123-def'];
      expect(() => validateProject(groups, 'abc-123-def')).not.toThrow();
    });

    it('should validate project access when both vlabId and projectId are provided', () => {
      const groups = ['/proj/abc-123-def/proj-456-ghi'];
      expect(() => validateProject(groups, 'abc-123-def', 'proj-456-ghi')).not.toThrow();
    });

    it('should throw error when projectId is provided without vlabId', () => {
      const groups = ['/proj/abc-123-def/proj-456-ghi'];
      expect(() => validateProject(groups, null, 'proj-456-ghi')).toThrow(
        'Virtual-lab ID must be provided when providing a project ID'
      );
    });

    it('should not validate when neither vlabId nor projectId is provided', () => {
      const groups: string[] = [];
      expect(() => validateProject(groups)).not.toThrow();
      expect(() => validateProject(groups, null, null)).not.toThrow();
    });

    it('should deny access when user does not belong to virtual lab', () => {
      const groups = ['/vlab/other-vlab'];
      expect(() => validateProject(groups, 'abc-123-def')).toThrow(AuthorizationError);
    });

    it('should deny access when user does not belong to project', () => {
      const groups = ['/proj/abc-123-def/other-project'];
      expect(() => validateProject(groups, 'abc-123-def', 'proj-456-ghi')).toThrow(
        AuthorizationError
      );
    });
  });

  describe('validateAuth', () => {
    it('should throw AuthenticationError when Authorization header is missing', async () => {
      const request = new NextRequest('http://localhost/api/test');

      await expect(validateAuth(request)).rejects.toThrow(AuthenticationError);
      await expect(validateAuth(request)).rejects.toThrow(
        'Missing or invalid Authorization header'
      );
    });

    it('should throw AuthenticationError when Authorization header is malformed', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'InvalidFormat token',
        },
      });

      await expect(validateAuth(request)).rejects.toThrow(AuthenticationError);
      await expect(validateAuth(request)).rejects.toThrow(
        'Missing or invalid Authorization header'
      );
    });

    it('should throw AuthenticationError when token is invalid', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      await expect(validateAuth(request)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('validateAuthOptional', () => {
    it('should return null when Authorization header is missing', async () => {
      const request = new NextRequest('http://localhost/api/test');

      const result = await validateAuthOptional(request);
      expect(result).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      const result = await validateAuthOptional(request);
      expect(result).toBeNull();
    });
  });
});
