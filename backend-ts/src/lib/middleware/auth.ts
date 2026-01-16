/**
 * Authentication middleware for JWT validation with Keycloak.
 * 
 * Provides functions for:
 * - JWT token validation using Keycloak's public keys
 * - User information extraction from JWT payload
 * - Project and virtual lab access validation
 */

import { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { getSettings } from '../config/settings';

/**
 * User information extracted from JWT token
 */
export interface UserInfo {
  sub: string;
  groups: string[];
  emailVerified?: boolean;
  name?: string;
  preferredUsername?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
}

/**
 * Custom error for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error for authorization failures
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Extract bearer token from Authorization header.
 * 
 * @param request - Next.js request object
 * @returns Bearer token string or null if not present
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Validate JWT token with Keycloak and extract user information.
 * 
 * This function:
 * 1. Extracts the bearer token from the Authorization header
 * 2. Verifies the JWT signature using Keycloak's public keys (JWKS)
 * 3. Validates token expiration and other claims
 * 4. Extracts user information from the token payload
 * 
 * @param request - Next.js request object
 * @returns User information extracted from valid JWT token
 * @throws AuthenticationError if token is missing, invalid, or expired
 * 
 * @example
 * ```typescript
 * const userInfo = await validateAuth(request);
 * console.log(`User ID: ${userInfo.sub}`);
 * console.log(`Groups: ${userInfo.groups.join(', ')}`);
 * ```
 */
export async function validateAuth(request: NextRequest): Promise<UserInfo> {
  const settings = getSettings();

  // Extract token from Authorization header
  const token = extractBearerToken(request);

  if (!token) {
    throw new AuthenticationError('Missing or invalid Authorization header');
  }

  try {
    // Get Keycloak JWKS endpoint
    const jwksUrl = `${settings.keycloak.issuer}/protocol/openid-connect/certs`;

    // Create JWKS client for fetching and caching public keys
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: settings.keycloak.issuer,
      // Additional validation options can be added here
    });

    // Extract user information from payload
    const userInfo: UserInfo = {
      sub: payload.sub as string,
      groups: (payload['groups'] as string[]) || [],
      emailVerified: payload['email_verified'] as boolean | undefined,
      name: payload['name'] as string | undefined,
      preferredUsername: payload['preferred_username'] as string | undefined,
      givenName: payload['given_name'] as string | undefined,
      familyName: payload['family_name'] as string | undefined,
      email: payload['email'] as string | undefined,
    };

    return userInfo;
  } catch (error) {
    // Log error for debugging (in production, use proper logging)
    console.error('JWT validation failed:', error);

    if (error instanceof Error) {
      throw new AuthenticationError(`Invalid token: ${error.message}`);
    }

    throw new AuthenticationError('Invalid token');
  }
}

/**
 * Validate user access to a virtual lab.
 * 
 * Checks if the user's groups include the virtual lab membership.
 * Group format: `/vlab/{vlabId}`
 * 
 * @param groups - User's group memberships from JWT token
 * @param vlabId - Virtual lab ID to validate access for
 * @throws AuthorizationError if user doesn't have access
 * 
 * @example
 * ```typescript
 * validateVirtualLabAccess(userInfo.groups, 'abc-123-def');
 * ```
 */
export function validateVirtualLabAccess(groups: string[], vlabId: string): void {
  const belongsToVlab = groups.some((group) => group.includes(`/vlab/${vlabId}`));

  if (!belongsToVlab) {
    throw new AuthorizationError('User does not belong to the virtual-lab');
  }
}

/**
 * Validate user access to a project within a virtual lab.
 * 
 * Checks if the user's groups include the project membership.
 * Group format: `/proj/{vlabId}/{projectId}`
 * 
 * @param groups - User's group memberships from JWT token
 * @param vlabId - Virtual lab ID
 * @param projectId - Project ID to validate access for
 * @throws AuthorizationError if user doesn't have access
 * 
 * @example
 * ```typescript
 * validateProjectAccess(userInfo.groups, 'abc-123-def', 'proj-456-ghi');
 * ```
 */
export function validateProjectAccess(
  groups: string[],
  vlabId: string,
  projectId: string
): void {
  const belongsToProject = groups.some((group) =>
    group.includes(`/proj/${vlabId}/${projectId}`)
  );

  if (!belongsToProject) {
    throw new AuthorizationError('User does not belong to the project');
  }
}

/**
 * Validate user access to a virtual lab and/or project.
 * 
 * This is a convenience function that handles multiple validation scenarios:
 * - If only vlabId is provided: validates virtual lab access
 * - If both vlabId and projectId are provided: validates project access
 * - If only projectId is provided: throws error (vlabId is required)
 * - If neither is provided: no validation (returns immediately)
 * 
 * @param groups - User's group memberships from JWT token
 * @param vlabId - Optional virtual lab ID
 * @param projectId - Optional project ID
 * @throws AuthorizationError if user doesn't have required access
 * @throws Error if projectId is provided without vlabId
 * 
 * @example
 * ```typescript
 * // Validate virtual lab access only
 * validateProject(userInfo.groups, 'abc-123-def');
 * 
 * // Validate project access (also validates vlab access)
 * validateProject(userInfo.groups, 'abc-123-def', 'proj-456-ghi');
 * ```
 */
export function validateProject(
  groups: string[],
  vlabId?: string | null,
  projectId?: string | null
): void {
  if (vlabId && !projectId) {
    // Validate virtual lab access only
    validateVirtualLabAccess(groups, vlabId);
  } else if (vlabId && projectId) {
    // Validate project access (which implies vlab access)
    validateProjectAccess(groups, vlabId, projectId);
  } else if (!vlabId && projectId) {
    // Error: project ID provided without vlab ID
    throw new Error('Virtual-lab ID must be provided when providing a project ID');
  }
  // If neither vlabId nor projectId is provided, no validation needed
}

/**
 * Validate authentication and return user info, or return null if authentication fails.
 * 
 * This is a non-throwing variant of validateAuth that returns null instead of throwing
 * an error. Useful for optional authentication scenarios.
 * 
 * @param request - Next.js request object
 * @returns User information or null if authentication fails
 * 
 * @example
 * ```typescript
 * const userInfo = await validateAuthOptional(request);
 * if (userInfo) {
 *   console.log(`Authenticated as: ${userInfo.email}`);
 * } else {
 *   console.log('Anonymous user');
 * }
 * ```
 */
export async function validateAuthOptional(
  request: NextRequest
): Promise<UserInfo | null> {
  try {
    return await validateAuth(request);
  } catch (error) {
    return null;
  }
}
