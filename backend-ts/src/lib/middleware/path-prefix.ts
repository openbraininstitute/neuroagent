/**
 * Path prefix stripping middleware utilities
 *
 * Provides functions to strip a configured prefix from request paths.
 * This is useful when the application is deployed behind a reverse proxy
 * or API gateway that adds a path prefix.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '../config/settings';

/**
 * Check if a path should have its prefix stripped
 *
 * @param pathname - The request pathname
 * @param prefix - The prefix to check for
 * @returns True if the path starts with the prefix and should be stripped
 */
export function shouldStripPrefix(pathname: string, prefix: string): boolean {
  return (
    prefix.length > 0 &&
    pathname.startsWith(prefix) &&
    // Don't strip prefix from Next.js internal routes
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api/_next')
  );
}

/**
 * Strip the configured prefix from a request path
 *
 * This function checks if the application has a configured prefix
 * (from NEUROAGENT_MISC__APPLICATION_PREFIX environment variable)
 * and strips it from the request path if present.
 *
 * @param request - The incoming request
 * @returns A new request with the prefix stripped, or the original request if no stripping needed
 */
export function stripPathPrefix(request: NextRequest): NextRequest {
  const settings = getSettings();
  const prefix = settings.misc.applicationPrefix;

  // If no prefix configured or prefix is empty, return original request
  if (!prefix || prefix.length === 0) {
    return request;
  }

  const pathname = request.nextUrl.pathname;

  // Check if we should strip the prefix
  if (!shouldStripPrefix(pathname, prefix)) {
    return request;
  }

  // Create a new URL with the prefix stripped
  const newUrl = new URL(request.url);
  newUrl.pathname = pathname.slice(prefix.length) || '/';

  // Create a new request with the modified URL
  // Note: We need to preserve all other request properties
  // Using type assertion because Next.js RequestInit is slightly different from standard RequestInit
  return new NextRequest(newUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    duplex: 'half',
  } as any);
}

/**
 * Apply path prefix stripping to a middleware chain
 *
 * This is a higher-order function that wraps a middleware function
 * and applies path prefix stripping before calling the wrapped middleware.
 *
 * @param middleware - The middleware function to wrap
 * @returns A new middleware function with path prefix stripping applied
 */
export function withPathPrefixStripping(
  middleware: (request: NextRequest) => NextResponse | Promise<NextResponse>
): (request: NextRequest) => NextResponse | Promise<NextResponse> {
  return (request: NextRequest) => {
    const strippedRequest = stripPathPrefix(request);
    return middleware(strippedRequest);
  };
}
