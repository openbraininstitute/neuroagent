import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  addCorsHeaders,
  isCorsPreflightRequest,
  handleCorsPreflightRequest,
  addRequestIdHeader,
  stripPathPrefix,
} from './lib/middleware';

/**
 * Next.js proxy for request processing
 *
 * This proxy runs on all requests and handles (in order):
 * 1. Path prefix stripping (if configured)
 * 2. CORS preflight requests (OPTIONS)
 * 3. Request ID generation for correlation
 * 4. CORS headers for API routes
 *
 * Proxy order is important:
 * - Path prefix stripping must happen first to normalize paths
 * - CORS preflight must be handled early to avoid unnecessary processing
 * - Request ID should be added to all requests for tracing
 * - CORS headers should be added last to ensure they're on all responses
 */
export function proxy(request: NextRequest) {
  // 1. Strip path prefix if configured
  // This modifies the request URL to remove any configured application prefix
  const strippedRequest = stripPathPrefix(request);

  // 2. Handle CORS preflight requests (OPTIONS)
  // These should return immediately with appropriate headers
  if (isCorsPreflightRequest(strippedRequest)) {
    return handleCorsPreflightRequest(strippedRequest);
  }

  // 3. Continue with the request
  const response = NextResponse.next({
    request: strippedRequest,
  });

  // 4. Add request ID for correlation
  // This allows tracing requests through logs and debugging
  addRequestIdHeader(response, strippedRequest);

  // 5. Add CORS headers for API routes
  // This is in addition to the static headers in next.config.ts
  if (strippedRequest.nextUrl.pathname.startsWith('/api')) {
    addCorsHeaders(response, strippedRequest);
  }

  return response;
}

// Configure which routes use this proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
